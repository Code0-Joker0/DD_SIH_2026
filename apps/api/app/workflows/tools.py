from langchain_core.tools import tool
from app.rag.retriever import retriever
from app.services.sandbox_service import sandbox_service
from app.services.docgen_service import docgen_service
from app.services.vision_service import vision_service
import json
import asyncio
from typing import Literal

from app.rag.reranker import BGEReranker

reranker = BGEReranker()


@tool
async def search_knowledge_base(query: str) -> str:
    """Search the vector database for knowledge related to the query.

    Returns the text of relevant document chunks, each labelled with its
    source so the agent can cite them accurately.

    Query formulation guidelines:
    - Use broad, conceptual terms that capture the core semantic meaning.
    - DO NOT over-specify or include irrelevant specific entities (e.g., if asked 
      about procedures for "pump P-101", search for "operating procedures" rather 
      than "operating procedures for pump P-101"). Over-specification degrades 
      vector retrieval performance.
    """
    results = await retriever.search(query=query, limit=10)
    if not results:
        return "No relevant documents found."

    reranked = await asyncio.to_thread(reranker.rerank, query, results, 3)

    blocks = []
    for i, item in enumerate(reranked, start=1):
        payload = item.get("payload", {})
        text = payload.get("text", "").strip()
        source = payload.get("filename") or payload.get("source", "unknown")
        if text:
            blocks.append(f"[Source {i} — {source}]\n{text}")

    return "\n\n---\n\n".join(blocks) if blocks else "No relevant documents found."


@tool
async def run_code_sandbox(code: str) -> str:
    """Run arbitrary Python 3 code in an isolated Docker sandbox.

    Useful for data analysis, computations, or testing logic.
    Returns the stdout and stderr.
    """
    result = await sandbox_service.run_code(code)
    return result


@tool
async def generate_document(content: str, title: str) -> str:
    """Generate a final deliverable document with the given title and markdown content.

    Returns the path to the generated document.
    """
    path = await docgen_service.generate_document(content=content, title=title)
    return f"Document successfully generated and saved to: {path}"

@tool
async def analyze_multiple_images(images: list[str], instruction: str) -> str:
    """Analyze multiple images together for cross-referencing, mapping equipment tags, and joint understanding.
    Input images must be a list of absolute filepaths.
    Output is a JSON string containing description, objects, observations, and confidence across all images.
    """
    res = await vision_service.analyze_multiple_images(images, instruction)
    return res.model_dump_json()

@tool
async def analyze_image(image: str, instruction: str) -> str:
    """Analyze an image for basic understanding, equipment identification, and spatial relationships.
    Input image must be an absolute filepath.
    Output is a JSON string containing description, objects, observations, and confidence.
    """
    res = await vision_service.analyze_image(image, instruction)
    return res.model_dump_json()

@tool
async def extract_visual_text(image: str, mode: Literal['qwen', 'paddle']) -> str:
    """Extract nameplates, labels, tables, and visible text from an image.
    Input image must be an absolute filepath.
    Choose mode='qwen' for normal visual question answering or general text.
    Choose mode='paddle' for heavy, high-quality document/text extraction (like nameplates).
    Output is a JSON string containing equipment_tag, manufacturer, model, serial_number, pressure, temperature, and other fields.
    """
    res = await vision_service.extract_visual_text(image, mode)
    return res.model_dump_json()

@tool
async def analyze_diagram(image: str, instruction: str) -> str:
    """Analyze a P&ID or technical diagram to understand process flow, pipelines, valves, and equipment.
    Input image must be an absolute filepath.
    Output is a JSON string containing equipment, pipelines, valves, instruments, connections, and process_flow.
    """
    res = await vision_service.analyze_diagram(image, instruction)
    return res.model_dump_json()

@tool
async def inspect_image(image: str) -> str:
    """Perform a visual inspection and anomaly detection on an image.
    Input image must be an absolute filepath.
    Output is a JSON string containing a list of findings (observation, evidence, recommended_check).
    """
    res = await vision_service.inspect_image(image)
    return res.model_dump_json()

@tool
async def vision_grounding(image: str, question: str) -> str:
    """An anti-hallucination tool. Ask a specific question about an image (e.g., "What is the serial number?").
    Input image must be an absolute filepath.
    The tool will return the exact information or explicitly state if it is not visible or unreadable.
    """
    return await vision_service.vision_grounding(image, question)

TOOLS = [
    search_knowledge_base,
    run_code_sandbox,
    generate_document,
    analyze_multiple_images,
    analyze_image,
    extract_visual_text,
    analyze_diagram,
    inspect_image,
    vision_grounding,
]
