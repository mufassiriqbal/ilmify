#!/usr/bin/env python3
"""
Ilmify - PDF Compression Utility
Compresses PDFs to reduce storage and improve loading times.

Usage:
    python scripts/pdf_compressor.py           # Compress all PDFs
    python scripts/pdf_compressor.py --force   # Force recompress all
    python scripts/pdf_compressor.py file.pdf  # Compress single file
"""

import os
import sys
import json
import shutil
from pathlib import Path
from datetime import datetime

# Try to import PyMuPDF
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("❌ PyMuPDF not installed. Run: pip install pymupdf")
    sys.exit(1)

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = SCRIPT_DIR.parent
CONTENT_DIR = PROJECT_DIR / "content"
COMPRESSED_LOG = PROJECT_DIR / "portal" / "data" / "compressed_files.json"

# Compression settings
MAX_IMAGE_DIMENSION = 1200  # Max width/height for images
IMAGE_QUALITY = 70  # JPEG quality (0-100)
TARGET_SIZE_MB = 5  # Target max size in MB


def get_file_size_mb(path: Path) -> float:
    """Get file size in MB."""
    return path.stat().st_size / (1024 * 1024)


def load_compression_log() -> dict:
    """Load log of previously compressed files."""
    if COMPRESSED_LOG.exists():
        try:
            with open(COMPRESSED_LOG, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}


def save_compression_log(log: dict):
    """Save compression log."""
    COMPRESSED_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(COMPRESSED_LOG, 'w', encoding='utf-8') as f:
        json.dump(log, f, indent=2, ensure_ascii=False)


def compress_pdf(input_path: Path, output_path: Path = None, quality: int = IMAGE_QUALITY) -> dict:
    """
    Compress a PDF file by:
    1. Reducing image quality and dimensions
    2. Removing unnecessary metadata
    3. Optimizing the file structure
    
    Returns compression stats.
    """
    if output_path is None:
        output_path = input_path
    
    original_size = get_file_size_mb(input_path)
    
    try:
        # Open the PDF
        doc = fitz.open(str(input_path))
        
        # Check if we have Pillow for image compression
        has_pillow = False
        try:
            from PIL import Image
            import io as pil_io
            has_pillow = True
        except ImportError:
            pass
        
        images_compressed = 0
        
        # Process each page to compress images
        if has_pillow and original_size > 5:  # Only compress images if file > 5MB
            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images(full=True)
                
                for img_info in image_list:
                    xref = img_info[0]
                    
                    try:
                        # Extract image
                        base_image = doc.extract_image(xref)
                        if not base_image:
                            continue
                        
                        image_bytes = base_image["image"]
                        
                        # Skip if already small
                        if len(image_bytes) < 100000:  # Less than 100KB
                            continue
                        
                        # Open image with Pillow
                        img = Image.open(pil_io.BytesIO(image_bytes))
                        
                        # Resize if too large
                        max_dim = MAX_IMAGE_DIMENSION
                        if img.width > max_dim or img.height > max_dim:
                            ratio = min(max_dim / img.width, max_dim / img.height)
                            new_size = (int(img.width * ratio), int(img.height * ratio))
                            img = img.resize(new_size, Image.LANCZOS)
                        
                        # Convert to RGB if necessary (for JPEG)
                        if img.mode in ('RGBA', 'P', 'LA'):
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'RGBA' or img.mode == 'LA':
                                background.paste(img, mask=img.split()[-1])
                            else:
                                background.paste(img)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Save with compression
                        buffer = pil_io.BytesIO()
                        img.save(buffer, format='JPEG', quality=quality, optimize=True)
                        compressed_bytes = buffer.getvalue()
                        
                        # Only update if significantly smaller (at least 20% reduction)
                        if len(compressed_bytes) < len(image_bytes) * 0.8:
                            # Create a new image xref with compressed data
                            # Note: This replaces the image in the PDF
                            page.insert_image(
                                page.rect,
                                stream=compressed_bytes,
                                xref=xref,
                                keep_proportion=True
                            )
                            images_compressed += 1
                            
                    except Exception as e:
                        continue
        
        # Save with garbage collection and deflate compression
        temp_path = input_path.with_suffix('.temp.pdf')
        
        doc.save(
            str(temp_path),
            garbage=4,  # Maximum garbage collection
            deflate=True,  # Use deflate compression
            clean=True,  # Clean content streams
        )
        doc.close()
        
        # Check if compression was successful
        if temp_path.exists():
            new_size = get_file_size_mb(temp_path)
            
            # Only keep if meaningfully smaller (at least 5% reduction)
            if new_size < original_size * 0.95:
                # Replace original
                if output_path == input_path:
                    shutil.move(str(temp_path), str(output_path))
                else:
                    shutil.copy(str(temp_path), str(output_path))
                    temp_path.unlink()
                
                return {
                    'success': True,
                    'original_size_mb': round(original_size, 2),
                    'compressed_size_mb': round(new_size, 2),
                    'reduction_percent': round((1 - new_size / original_size) * 100, 1)
                }
            else:
                # Remove temp file, keep original
                temp_path.unlink()
                return {
                    'success': True,
                    'original_size_mb': round(original_size, 2),
                    'compressed_size_mb': round(original_size, 2),
                    'reduction_percent': 0,
                    'note': 'Already optimized'
                }
        
        return {
            'success': False,
            'error': 'Compression failed'
        }
        
    except Exception as e:
        # Clean up temp file if exists
        temp_path = input_path.with_suffix('.temp.pdf')
        if temp_path.exists():
            temp_path.unlink()
        
        return {
            'success': False,
            'error': str(e)
        }


def compress_all_pdfs(force: bool = False) -> dict:
    """Compress all PDFs in the content directory."""
    results = {
        'processed': 0,
        'compressed': 0,
        'skipped': 0,
        'failed': 0,
        'total_saved_mb': 0,
        'details': []
    }
    
    # Load compression log
    log = load_compression_log()
    
    # Find all PDFs
    pdf_files = list(CONTENT_DIR.rglob('*.pdf'))
    
    if not pdf_files:
        print("📭 No PDF files found in content directory.")
        return results
    
    print(f"📚 Found {len(pdf_files)} PDF(s) to process\n")
    
    for pdf_path in pdf_files:
        file_key = str(pdf_path.relative_to(PROJECT_DIR))
        original_size = get_file_size_mb(pdf_path)
        
        print(f"📄 {pdf_path.name} ({original_size:.2f} MB)")
        
        # Check if already compressed (unless force)
        if not force and file_key in log:
            last_size = log[file_key].get('size_mb', 0)
            # Skip if size hasn't changed
            if abs(last_size - original_size) < 0.01:
                print(f"   ⏭️  Already compressed, skipping")
                results['skipped'] += 1
                continue
        
        # Compress
        print(f"   🔄 Compressing...")
        result = compress_pdf(pdf_path)
        
        if result['success']:
            saved = result['original_size_mb'] - result['compressed_size_mb']
            if result.get('reduction_percent', 0) > 0:
                print(f"   ✅ Compressed: {result['original_size_mb']:.2f} MB → {result['compressed_size_mb']:.2f} MB ({result['reduction_percent']}% reduction)")
                results['compressed'] += 1
                results['total_saved_mb'] += saved
            else:
                print(f"   ✅ Already optimized ({result['compressed_size_mb']:.2f} MB)")
                results['skipped'] += 1
            
            # Update log
            log[file_key] = {
                'size_mb': result['compressed_size_mb'],
                'compressed_at': datetime.now().isoformat(),
                'original_size_mb': result['original_size_mb']
            }
        else:
            print(f"   ❌ Failed: {result.get('error', 'Unknown error')}")
            results['failed'] += 1
        
        results['processed'] += 1
        results['details'].append({
            'file': pdf_path.name,
            **result
        })
    
    # Save log
    save_compression_log(log)
    
    return results


def compress_single_file(file_path: str) -> dict:
    """Compress a single PDF file."""
    path = Path(file_path)
    
    if not path.exists():
        return {'success': False, 'error': 'File not found'}
    
    if path.suffix.lower() != '.pdf':
        return {'success': False, 'error': 'Not a PDF file'}
    
    original_size = get_file_size_mb(path)
    print(f"📄 Compressing: {path.name} ({original_size:.2f} MB)")
    
    result = compress_pdf(path)
    
    if result['success']:
        if result.get('reduction_percent', 0) > 0:
            print(f"✅ Compressed: {result['original_size_mb']:.2f} MB → {result['compressed_size_mb']:.2f} MB")
            print(f"   Saved {result['reduction_percent']}%")
        else:
            print(f"✅ File is already optimized")
    else:
        print(f"❌ Failed: {result.get('error')}")
    
    return result


def main():
    """CLI entry point."""
    print("=" * 50)
    print("📚 Ilmify PDF Compressor")
    print("=" * 50)
    print()
    
    # Parse arguments
    args = sys.argv[1:]
    force = '--force' in args or '-f' in args
    
    # Remove flags from args
    args = [a for a in args if not a.startswith('-')]
    
    if args:
        # Compress specific file
        for file_path in args:
            compress_single_file(file_path)
    else:
        # Compress all
        if force:
            print("🔄 Force mode: Re-compressing all files\n")
        
        results = compress_all_pdfs(force=force)
        
        print()
        print("-" * 50)
        print(f"📊 Summary:")
        print(f"   • Processed: {results['processed']} files")
        print(f"   • Compressed: {results['compressed']} files")
        print(f"   • Skipped: {results['skipped']} files")
        print(f"   • Failed: {results['failed']} files")
        if results['total_saved_mb'] > 0:
            print(f"   • Total saved: {results['total_saved_mb']:.2f} MB")
    
    print("=" * 50)


if __name__ == '__main__':
    main()
