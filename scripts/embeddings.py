#!/usr/bin/env python3
"""
Ilmify - Vector Embedding System
Creates and stores embeddings for PDF content for semantic search.

This uses a simple but effective TF-IDF based approach that works offline
without requiring external APIs or large ML models.
"""

import json
import math
import re
import hashlib
from pathlib import Path
from collections import Counter, defaultdict
from typing import List, Dict, Tuple, Optional

# Try to import fitz (PyMuPDF), fall back gracefully if not available
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("⚠️  PyMuPDF not installed. Run: pip install pymupdf")

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = SCRIPT_DIR.parent
CONTENT_DIR = PROJECT_DIR / "content"
METADATA_FILE = PROJECT_DIR / "portal" / "data" / "metadata.json"
VECTORS_DIR = PROJECT_DIR / "portal" / "data" / "vectors"
VECTOR_INDEX_FILE = VECTORS_DIR / "index.json"

# Embedding settings
CHUNK_SIZE = 500  # characters per chunk
CHUNK_OVERLAP = 100  # overlap between chunks
MAX_PAGES_PER_PDF = 100  # max pages to process
VECTOR_DIMENSIONS = 300  # vocabulary size for vectors

# Stopwords (English + Urdu common words)
STOPWORDS = set([
    # English
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
    'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'this', 'that',
    'these', 'those', 'it', 'its', 'as', 'from', 'can', 'may', 'which', 'who',
    'what', 'when', 'where', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'same',
    'than', 'too', 'very', 'just', 'also', 'into', 'over', 'after', 'before',
    'between', 'under', 'above', 'below', 'about', 'there', 'here', 'your',
    'you', 'he', 'she', 'they', 'we', 'i', 'my', 'our', 'his', 'her', 'their',
    'them', 'us', 'me', 'him', 'any', 'if', 'then', 'so', 'because', 'while',
    # Common PDF artifacts
    'page', 'chapter', 'section', 'figure', 'table', 'ref', 'see', 'note',
])


def extract_pdf_text(pdf_path: Path, max_pages: int = MAX_PAGES_PER_PDF) -> str:
    """Extract text from PDF file."""
    if not PYMUPDF_AVAILABLE:
        return ""
    
    try:
        doc = fitz.open(str(pdf_path))
        text_parts = []
        
        for page_num in range(min(len(doc), max_pages)):
            page = doc[page_num]
            text = page.get_text()
            if text.strip():
                text_parts.append(text)
        
        doc.close()
        return '\n\n'.join(text_parts)
    except Exception as e:
        print(f"    ⚠️  Error extracting text: {e}")
        return ""


def clean_text(text: str) -> str:
    """Clean and normalize text."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters but keep basic punctuation
    text = re.sub(r'[^\w\s.,!?;:\'"()-]', ' ', text)
    # Remove excessive punctuation
    text = re.sub(r'[.,!?;:]{2,}', '.', text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """Split text into overlapping chunks."""
    if len(text) < chunk_size:
        return [text] if text.strip() else []
    
    chunks = []
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk) + len(sentence) > chunk_size:
            if current_chunk:
                chunks.append(current_chunk.strip())
                # Keep overlap from previous chunk
                words = current_chunk.split()
                overlap_words = words[-overlap//5:] if len(words) > overlap//5 else words
                current_chunk = ' '.join(overlap_words) + ' ' + sentence
            else:
                current_chunk = sentence
        else:
            current_chunk += ' ' + sentence
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    
    return chunks


def tokenize(text: str) -> List[str]:
    """Tokenize text into words."""
    text = text.lower()
    words = re.findall(r'\b[a-z]{2,}\b', text)
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency."""
    tf = Counter(tokens)
    total = len(tokens) or 1
    return {word: count / total for word, count in tf.items()}


def compute_idf(documents: List[List[str]], vocabulary: set) -> Dict[str, float]:
    """Compute inverse document frequency."""
    n_docs = len(documents)
    idf = {}
    
    for word in vocabulary:
        doc_count = sum(1 for doc in documents if word in doc)
        idf[word] = math.log((n_docs + 1) / (doc_count + 1)) + 1
    
    return idf


def create_tfidf_vector(tokens: List[str], idf: Dict[str, float], vocabulary: List[str]) -> List[float]:
    """Create TF-IDF vector for a document."""
    tf = compute_tf(tokens)
    vector = []
    
    for word in vocabulary:
        tfidf = tf.get(word, 0) * idf.get(word, 0)
        vector.append(round(tfidf, 6))
    
    return vector


def normalize_vector(vector: List[float]) -> List[float]:
    """Normalize vector to unit length."""
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude == 0:
        return vector
    return [round(v / magnitude, 6) for v in vector]


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    return dot_product  # Already normalized


def get_file_hash(file_path: Path) -> str:
    """Get hash of file for change detection."""
    stat = file_path.stat()
    return hashlib.md5(f"{file_path}:{stat.st_mtime}:{stat.st_size}".encode()).hexdigest()


class VectorStore:
    """Manages vector embeddings for documents."""
    
    def __init__(self):
        self.vocabulary: List[str] = []
        self.idf: Dict[str, float] = {}
        self.documents: List[Dict] = []
        self.file_hashes: Dict[str, str] = {}
        self.loaded = False
    
    def load(self) -> bool:
        """Load existing vector index."""
        try:
            if VECTOR_INDEX_FILE.exists():
                with open(VECTOR_INDEX_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.vocabulary = data.get('vocabulary', [])
                    self.idf = data.get('idf', {})
                    self.documents = data.get('documents', [])
                    self.file_hashes = data.get('file_hashes', {})
                    self.loaded = True
                    return True
        except Exception as e:
            print(f"⚠️  Error loading vector index: {e}")
        return False
    
    def save(self) -> bool:
        """Save vector index to file."""
        try:
            VECTORS_DIR.mkdir(parents=True, exist_ok=True)
            
            data = {
                'version': '2.0',
                'timestamp': str(Path(__file__).stat().st_mtime),
                'vocabulary': self.vocabulary,
                'idf': self.idf,
                'documents': self.documents,
                'file_hashes': self.file_hashes,
                'stats': {
                    'total_documents': len(self.documents),
                    'vocabulary_size': len(self.vocabulary),
                    'total_files': len(self.file_hashes)
                }
            }
            
            with open(VECTOR_INDEX_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"❌ Error saving vector index: {e}")
            return False
    
    def needs_update(self, pdf_path: Path) -> bool:
        """Check if a PDF needs to be re-indexed."""
        current_hash = get_file_hash(pdf_path)
        stored_hash = self.file_hashes.get(str(pdf_path), '')
        return current_hash != stored_hash
    
    def build_index(self, force_rebuild: bool = False) -> int:
        """Build or update the vector index from PDFs."""
        if not PYMUPDF_AVAILABLE:
            print("❌ PyMuPDF is required. Install with: pip install pymupdf")
            return 0
        
        # Load metadata
        if not METADATA_FILE.exists():
            print("❌ No metadata.json found. Run the server first.")
            return 0
        
        with open(METADATA_FILE, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        pdf_resources = [r for r in metadata if r.get('format') == 'pdf']
        
        if not pdf_resources:
            print("📭 No PDF resources found.")
            return 0
        
        print(f"📚 Found {len(pdf_resources)} PDF(s) to process")
        
        # Load existing index if not forcing rebuild
        if not force_rebuild:
            self.load()
        
        # Collect all text for IDF calculation
        all_documents_tokens = []
        documents_to_process = []
        
        for resource in pdf_resources:
            pdf_path = PROJECT_DIR / resource['filepath']
            
            if not pdf_path.exists():
                print(f"  ⏭️  Skipping (not found): {resource['title']}")
                continue
            
            # Check if needs update
            if not force_rebuild and not self.needs_update(pdf_path):
                print(f"  ✅ Already indexed: {resource['title']}")
                # Keep existing documents for this file
                continue
            
            print(f"  📖 Processing: {resource['title']}...")
            
            # Extract and clean text
            text = extract_pdf_text(pdf_path)
            if len(text) < 100:
                print(f"      ⚠️  Too little text extracted")
                continue
            
            text = clean_text(text)
            chunks = chunk_text(text)
            
            print(f"      📝 Created {len(chunks)} chunks")
            
            documents_to_process.append({
                'resource': resource,
                'pdf_path': pdf_path,
                'chunks': chunks
            })
            
            # Collect tokens for vocabulary
            for chunk in chunks:
                tokens = tokenize(chunk)
                all_documents_tokens.append(tokens)
        
        if not documents_to_process and not self.documents:
            print("📭 No documents to process.")
            return 0
        
        # Include existing document tokens if doing incremental update
        if not force_rebuild and self.documents:
            for doc in self.documents:
                all_documents_tokens.append(doc.get('tokens', []))
        
        # Build vocabulary from most common words
        all_tokens = [token for doc_tokens in all_documents_tokens for token in doc_tokens]
        token_counts = Counter(all_tokens)
        self.vocabulary = [word for word, _ in token_counts.most_common(VECTOR_DIMENSIONS)]
        vocabulary_set = set(self.vocabulary)
        
        print(f"\n📊 Vocabulary size: {len(self.vocabulary)} words")
        
        # Compute IDF
        self.idf = compute_idf(all_documents_tokens, vocabulary_set)
        
        # Remove old documents for files being reprocessed
        if not force_rebuild:
            paths_to_remove = {str(d['pdf_path']) for d in documents_to_process}
            self.documents = [d for d in self.documents if d.get('source_path') not in paths_to_remove]
        else:
            self.documents = []
        
        # Create vectors for new chunks
        new_doc_count = 0
        for doc_info in documents_to_process:
            resource = doc_info['resource']
            pdf_path = doc_info['pdf_path']
            chunks = doc_info['chunks']
            
            for i, chunk in enumerate(chunks):
                tokens = tokenize(chunk)
                vector = create_tfidf_vector(tokens, self.idf, self.vocabulary)
                vector = normalize_vector(vector)
                
                self.documents.append({
                    'id': f"{resource['id']}_{i}",
                    'title': resource['title'],
                    'category': resource['category'],
                    'source_path': str(pdf_path),
                    'chunk_index': i,
                    'content': chunk[:1000],  # Store first 1000 chars
                    'tokens': tokens[:50],  # Store top tokens for reference
                    'vector': vector
                })
                new_doc_count += 1
            
            # Update file hash
            self.file_hashes[str(pdf_path)] = get_file_hash(pdf_path)
        
        # Save index
        self.save()
        
        print(f"\n✅ Indexed {new_doc_count} new chunks")
        print(f"📦 Total chunks in index: {len(self.documents)}")
        
        return new_doc_count
    
    def search(self, query: str, top_k: int = 5) -> List[Dict]:
        """Search for similar documents using vector similarity."""
        if not self.vocabulary or not self.documents:
            if not self.load():
                return []
        
        # Create query vector
        query_tokens = tokenize(query)
        query_vector = create_tfidf_vector(query_tokens, self.idf, self.vocabulary)
        query_vector = normalize_vector(query_vector)
        
        # Calculate similarities
        results = []
        for doc in self.documents:
            similarity = cosine_similarity(query_vector, doc.get('vector', []))
            if similarity > 0.05:  # Threshold
                results.append({
                    'id': doc['id'],
                    'title': doc['title'],
                    'category': doc['category'],
                    'content': doc['content'],
                    'score': round(similarity, 4)
                })
        
        # Sort by similarity
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:top_k]
    
    def get_stats(self) -> Dict:
        """Get index statistics."""
        return {
            'total_documents': len(self.documents),
            'vocabulary_size': len(self.vocabulary),
            'total_files': len(self.file_hashes)
        }


# Global vector store instance
vector_store = VectorStore()


def build_embeddings(force: bool = False) -> int:
    """Build embeddings (called from server or CLI)."""
    return vector_store.build_index(force_rebuild=force)


def search_embeddings(query: str, top_k: int = 5) -> List[Dict]:
    """Search embeddings (called from server)."""
    return vector_store.search(query, top_k)


def main():
    """CLI entry point."""
    print("=" * 50)
    print("📚 Ilmify Vector Embedding Builder")
    print("=" * 50)
    print()
    
    import sys
    force = '--force' in sys.argv or '-f' in sys.argv
    
    if force:
        print("🔄 Force rebuild enabled\n")
    
    count = build_embeddings(force=force)
    
    print()
    print("-" * 50)
    if count > 0:
        print(f"✅ Successfully created {count} embeddings!")
        print(f"💾 Saved to: {VECTOR_INDEX_FILE}")
    else:
        print("ℹ️  No new embeddings created.")
    print("=" * 50)


if __name__ == '__main__':
    main()
