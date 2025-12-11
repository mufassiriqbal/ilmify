#!/usr/bin/env python3
"""
Ilmify PDF Indexer - Tokenizes PDFs for fast chatbot retrieval
Run this after adding new resources to build/update the knowledge base
"""

import json
import re
from pathlib import Path
from datetime import datetime

try:
    import fitz  # PyMuPDF - type: ignore
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False
    print("⚠️  PyMuPDF not installed. Run: pip install PyMuPDF")

BASE_DIR = Path(__file__).resolve().parents[1]
CONTENT_DIR = BASE_DIR / "content"
DATA_DIR = BASE_DIR / "portal" / "data"
METADATA_FILE = DATA_DIR / "metadata.json"
INDEX_FILE = DATA_DIR / "knowledge_index.json"

# Stop words for keyword extraction
STOP_WORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that',
    'these', 'those', 'it', 'its', 'as', 'from', 'can', 'may', 'which', 'who',
    'what', 'when', 'where', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same', 'than', 'too',
    'very', 'just', 'also', 'into', 'over', 'after', 'before', 'between', 'under',
    'above', 'below', 'about', 'there', 'here', 'then', 'now', 'so', 'if', 'because',
    'while', 'although', 'though', 'unless', 'until', 'since', 'during', 'without',
    'within', 'through', 'being', 'having', 'doing', 'made', 'make', 'makes',
    'said', 'say', 'says', 'like', 'get', 'got', 'one', 'two', 'first', 'new',
    'used', 'use', 'using', 'many', 'much', 'must', 'shall', 'might'
}


def extract_text_from_pdf(pdf_path: Path, max_pages: int = 50) -> str:
    """Extract text from PDF using PyMuPDF"""
    if not HAS_PYMUPDF:
        return ""
    
    try:
        doc = fitz.open(str(pdf_path))
        text = ""
        num_pages = min(len(doc), max_pages)
        
        for page_num in range(num_pages):
            page = doc[page_num]
            text += page.get_text() + "\n\n"
        
        doc.close()
        return text.strip()
    except (OSError, ValueError, RuntimeError) as e:
        print(f"  ⚠️  Error extracting {pdf_path.name}: {e}")
        return ""


def extract_keywords(text: str) -> list:
    """Extract meaningful keywords from text"""
    # Clean and tokenize
    words = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower()).split()
    
    # Filter and count
    word_freq = {}
    for word in words:
        if len(word) > 2 and word not in STOP_WORDS and not word.isdigit():
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Return top keywords by frequency
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in sorted_words[:100]]


def split_into_chunks(text: str, chunk_size: int = 500) -> list:
    """Split text into meaningful chunks"""
    # Split by sentences
    sentences = re.split(r'[.!?।]+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return [c for c in chunks if len(c) > 50]  # Filter very short chunks


def build_index():
    """Build knowledge index from all PDF resources"""
    print("\n" + "=" * 50)
    print("📚 Ilmify Knowledge Indexer")
    print("=" * 50)
    
    if not HAS_PYMUPDF:
        print("\n❌ PyMuPDF is required. Install with: pip install PyMuPDF")
        return
    
    # Load metadata
    if not METADATA_FILE.exists():
        print(f"❌ Metadata file not found: {METADATA_FILE}")
        return
    
    with open(METADATA_FILE, 'r', encoding='utf-8') as f:
        resources = json.load(f)
    
    print(f"\n📄 Found {len(resources)} resources in metadata")
    
    # Filter PDFs
    pdfs = [r for r in resources if r.get('format') == 'pdf']
    print(f"📕 {len(pdfs)} PDF files to process")
    
    # Check existing index
    existing_index = {}
    if INDEX_FILE.exists():
        try:
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                existing_index = {item['resource_id']: item for item in data.get('chunks', [])}
                print(f"📦 Existing index has {len(existing_index)} entries")
        except (json.JSONDecodeError, KeyError, OSError):
            pass
    
    # Process each PDF
    knowledge_chunks = []
    processed = 0
    skipped = 0
    
    for resource in pdfs:
        resource_id = resource.get('id', resource.get('title', ''))
        title = resource.get('title', 'Unknown')
        filepath = resource.get('filepath', '')
        category = resource.get('category', 'textbooks')
        
        # Build full path
        if filepath.startswith('content/'):
            pdf_path = BASE_DIR / filepath
        else:
            pdf_path = BASE_DIR / "content" / filepath
        
        if not pdf_path.exists():
            print(f"  ⚠️  Not found: {filepath}")
            continue
        
        # Check if already indexed (by file modification time)
        file_mtime = pdf_path.stat().st_mtime
        existing = existing_index.get(resource_id)
        
        if existing and existing.get('file_mtime') == file_mtime:
            # Use existing chunks
            for chunk in existing.get('chunks', []):
                knowledge_chunks.append({
                    'resource_id': resource_id,
                    'title': title,
                    'category': category,
                    'content': chunk['content'],
                    'keywords': chunk['keywords'],
                    'chunk_index': chunk['chunk_index']
                })
            skipped += 1
            print(f"  ⏭️  Skipped (unchanged): {title}")
            continue
        
        print(f"  📖 Processing: {title}...")
        
        # Extract text
        text = extract_text_from_pdf(pdf_path, max_pages=50)
        
        if len(text) < 100:
            print("      ⚠️  Too little text extracted")
            continue
        
        # Split into chunks
        chunks = split_into_chunks(text, chunk_size=600)
        
        # Process each chunk
        for idx, chunk_text in enumerate(chunks):
            keywords = extract_keywords(chunk_text)
            
            knowledge_chunks.append({
                'resource_id': resource_id,
                'title': title,
                'category': category,
                'content': chunk_text,
                'keywords': keywords[:50],
                'chunk_index': idx,
                'file_mtime': file_mtime
            })
        
        processed += 1
        print(f"      ✅ Created {len(chunks)} chunks, {len(extract_keywords(text))} keywords")
    
    # Build final index
    index_data = {
        'version': 2,
        'generated': datetime.utcnow().isoformat() + 'Z',
        'total_chunks': len(knowledge_chunks),
        'total_resources': len(pdfs),
        'chunks': knowledge_chunks
    }
    
    # Save index
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    print("\n" + "-" * 50)
    print("✅ Indexing complete!")
    print(f"   📊 Processed: {processed} PDFs")
    print(f"   ⏭️  Skipped: {skipped} (unchanged)")
    print(f"   📦 Total chunks: {len(knowledge_chunks)}")
    print(f"   💾 Saved to: {INDEX_FILE}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    build_index()
