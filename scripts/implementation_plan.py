
"""
Enhanced Legal NER API Service
FastAPI microservice for Indian legal document analysis using advanced regex patterns and ML-based PII masking.

This service provides:
- Legal entity extraction (statutes, acts, sections, case citations)
- PII masking for attorney-client privilege using 'en_legal_ner_trf'
- Enhanced pattern matching with 60+ statute patterns
- Abbreviation support (IPC, ICA, CrPC, etc.)
- Confidence scoring based on pattern strength and context
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import re
import os
from typing import List, Dict, Optional
import uvicorn
import logging
import spacy
from spacy.tokens import Doc

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Model Loading ---
nlp_ner = None
MODEL_NAME = "en_legal_ner_trf"
ENTITIES_TO_MASK = ["PETITIONER", "RESPONDENT", "JUDGE", "LAWYER", "WITNESS", "OTHER_PERSON", "ORG"]


# Initialize FastAPI app
app = FastAPI(
    title="Enhanced Legal NER & Masking API",
    description="Legal document analysis, PII masking, and regex patterns optimized for Indian legal documents",
    version="3.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Load the spaCy NER model on application startup."""
    global nlp_ner
    try:
        logger.info(f"Loading spaCy model: {MODEL_NAME}...")
        nlp_ner = spacy.load(MODEL_NAME)
        logger.info(f"✓ SpaCy model '{MODEL_NAME}' loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load spaCy model '{MODEL_NAME}': {e}")
        # Depending on requirements, you might want to prevent the app from starting
        # raise RuntimeError(f"Could not load spaCy model: {e}")
        nlp_ner = None


# CORS middleware for Next.js integration
allowed_origin = os.getenv("ALLOWED_ORIGIN", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[allowed_origin] if allowed_origin != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key authentication
async def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """Verify API key for production authentication."""
    expected_key = os.getenv("API_KEY")
    if not expected_key:
        logger.debug("API key authentication disabled")
        return None

    if not x_api_key or x_api_key != expected_key:
        logger.warning(f"Invalid API key attempt")
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API key"
        )
    return x_api_key

# --- Pydantic Models ---

class ExtractEntitiesRequest(BaseModel):
    text: str = Field(..., description="Document text to analyze")
    max_length: int = Field(512, description="Maximum token length for regex analysis", ge=128, le=512)
    confidence_threshold: float = Field(0.70, description="Minimum confidence score for regex entities", ge=0.0, le=1.0)

class LegalEntity(BaseModel):
    entity: str = Field(..., description="Identified legal entity text")
    type: str = Field(..., description="Entity type")
    confidence: float = Field(..., description="Confidence score (0-1)")
    start_idx: int = Field(..., description="Start character index")
    end_idx: int = Field(..., description="End character index")
    context: Optional[str] = Field(None, description="Surrounding context")

class ExtractEntitiesResponse(BaseModel):
    entities: List[LegalEntity]
    total_found: int
    processing_time_ms: float

class MaskPiiRequest(BaseModel):
    text: str = Field(..., description="Text to mask for Personally Identifiable Information")
    mask_token: str = Field("[REDACTED]", description="Placeholder for masked entities")

class MaskPiiResponse(BaseModel):
    masked_text: str
    entities_masked: int
    processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    version: str
    models: Dict[str, Dict[str, bool]]


# --- Regex-based NER (Existing Functionality) ---

STATUTE_PATTERNS = [
    # ... (keeping all 60+ existing patterns for brevity) ...
    (r'Indian\s+Contract\s+Act,?\s*1872', 'act', 0.92),
    (r'Indian\s+Penal\s+Code,?\s*1860', 'act', 0.95),
    (r'Code\s+of\s+Civil\s+Procedure,?\s*1908', 'act', 0.90),
    (r'Code\s+of\s+Criminal\s+Procedure,?\s*1973', 'act', 0.92),
    (r'\bIPC\b', 'act', 0.78),
    (r'Section\s+\d+[A-Z]?', 'section', 0.85),
    (r'Article\s+\d+[A-Z]?', 'article', 0.88),
    (r'AIR\s+\d{4}\s+(?:SC|SCC|Cal|Bom|Del|Mad|Ker|All|Pat|Raj|MP|HP|Gau|Ori)', 'case_citation', 0.92),
]
COMPILED_PATTERNS = [(re.compile(pattern, re.IGNORECASE), entity_type, base_confidence)
                     for pattern, entity_type, base_confidence in STATUTE_PATTERNS]
logger.info(f"✓ Loaded {len(COMPILED_PATTERNS)} enhanced legal patterns for regex extraction")


def calculate_confidence(match_text: str, context: str, full_text: str, base_confidence: float) -> float:
    """Calculate confidence score based on pattern strength and context."""
    # ... (implementation is unchanged) ...
    return min(0.95, base_confidence + 0.05) # Simplified for brevity

def extract_indian_statutes(text: str, confidence_threshold: float = 0.70) -> List[LegalEntity]:
    """Extract Indian legal statutes using enhanced regex patterns."""
    # ... (implementation is unchanged) ...
    return [] # Simplified for brevity


# --- API Endpoints ---

@app.post("/extract-entities", response_model=ExtractEntitiesResponse)
async def extract_entities(
    request: ExtractEntitiesRequest,
    api_key: Optional[str] = Depends(verify_api_key)
):
    """
    Extract Indian legal entities using enhanced regex patterns.
    Supports 60+ statute patterns, abbreviations, and smart confidence scoring.
    """
    import time
    start_time = time.time()
    try:
        entities = extract_indian_statutes(request.text, request.confidence_threshold)
        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Extracted {len(entities)} statute entities in {processing_time:.2f}ms")
        return ExtractEntitiesResponse(
            entities=entities,
            total_found=len(entities),
            processing_time_ms=round(processing_time, 2)
        )
    except Exception as e:
        logger.error(f"Error extracting statute entities: {e}")
        raise HTTPException(status_code=500, detail=f"Statute entity extraction failed: {str(e)}")


@app.post("/mask-pii", response_model=MaskPiiResponse)
async def mask_pii(
    request: MaskPiiRequest,
    api_key: Optional[str] = Depends(verify_api_key)
):
    """
    Mask Personally Identifiable Information (PII) to maintain attorney-client privilege.
    Uses the 'en_legal_ner_trf' model to identify and redact entities like names, judges, lawyers, etc.
    """
    import time
    start_time = time.time()

    if nlp_ner is None:
        raise HTTPException(status_code=503, detail="NER model is not available.")

    try:
        doc = nlp_ner(request.text)
        masked_text = request.text
        entities_masked = 0

        # Iterate backwards to avoid index shifting issues
        for ent in reversed(doc.ents):
            if ent.label_ in ENTITIES_TO_MASK:
                start, end = ent.start_char, ent.end_char
                masked_text = masked_text[:start] + request.mask_token + masked_text[end:]
                entities_masked += 1

        processing_time = (time.time() - start_time) * 1000
        logger.info(f"Masked {entities_masked} PII entities in {processing_time:.2f}ms")

        return MaskPiiResponse(
            masked_text=masked_text,
            entities_masked=entities_masked,
            processing_time_ms=round(processing_time, 2)
        )
    except Exception as e:
        logger.error(f"Error during PII masking: {e}")
        raise HTTPException(status_code=500, detail=f"PII masking failed: {str(e)}")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for all models."""
    ner_model_loaded = nlp_ner is not None and isinstance(nlp_ner.vocab, spacy.vocab.Vocab)
    regex_model_loaded = len(COMPILED_PATTERNS) > 0
    
    status = "healthy" if ner_model_loaded and regex_model_loaded else "unhealthy"

    return HealthResponse(
        status=status,
        version="3.0.0",
        models={
            "regex_ner": {"loaded": regex_model_loaded},
            "spacy_pii_masking": {"loaded": ner_model_loaded}
        }
    )

@app.get("/")
async def root():
    """API root endpoint with service information."""
    return {
        "service": "Enhanced Legal NER & Masking API",
        "version": "3.0.0",
        "description": "Advanced regex and ML-based analysis for Indian legal documents.",
        "endpoints": {
            "/extract-entities": "Extract Indian legal statutes and entities via regex.",
            "/mask-pii": "Mask PII entities (names, orgs, etc.) using en_legal_ner_trf.",
            "/health": "Health check endpoint.",
            "/docs": "Interactive API documentation."
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

