import os
from pathlib import Path
from app.core.config import settings

class DocumentGenerationService:
    async def generate_document(self, content: str, title: str = "Deliverable") -> str:
        """
        Generates a document from the provided content. 
        Currently a stub that writes markdown to the data directory.
        Future implementations will use python-docx/python-pptx.
        """
        # Ensure deliverables directory exists
        deliverables_dir = Path(settings.DATA_ROOT) / "deliverables"
        deliverables_dir.mkdir(parents=True, exist_ok=True)
        
        filename = f"{title.lower().replace(' ', '_')}.md"
        filepath = deliverables_dir / filename
        
        # Stub implementation writes to markdown
        filepath.write_text(f"# {title}\n\n{content}")
        
        return str(filepath)

docgen_service = DocumentGenerationService()
