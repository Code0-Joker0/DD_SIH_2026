import base64
from typing import Literal, List, Optional
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from app.core.config import settings
from app.core.model_manager import _ensure_model_running

# --- Pydantic Models for Structured Output ---

class ImageAnalysisResponse(BaseModel):
    description: str = Field(description="Overall description of the image(s) or scene")
    objects: List[str] = Field(description="List of identified objects or components")
    observations: List[str] = Field(description="Key observations or cross-referenced findings")
    confidence: str = Field(description="Confidence level of the analysis (High, Medium, Low)")

class VisualTextExtraction(BaseModel):
    equipment_tag: str = Field(description="Equipment tag or ID. Use 'Not readable' if not found.")
    manufacturer: str = Field(description="Manufacturer name. Use 'Not readable' if not found.")
    model: str = Field(description="Model number or name. Use 'Not readable' if not found.")
    serial_number: str = Field(description="Serial number. Use 'Not readable' if not found.")
    pressure: str = Field(description="Pressure rating. Use 'Not readable' if not found.")
    temperature: str = Field(description="Temperature rating. Use 'Not readable' if not found.")
    other: List[str] = Field(description="Any other extracted key-value pairs or text.")

class DiagramAnalysis(BaseModel):
    equipment: List[str] = Field(description="List of major equipment in the diagram")
    pipelines: List[str] = Field(description="List of pipelines or flow lines")
    valves: List[str] = Field(description="List of valves identified")
    instruments: List[str] = Field(description="List of instruments or sensors")
    connections: List[str] = Field(description="How major components are connected")
    process_flow: List[str] = Field(description="Step-by-step process flow description")

class Observation(BaseModel):
    observation: str = Field(description="The visible anomaly or condition observed")
    evidence: str = Field(description="Visual evidence from the image supporting this observation")
    recommended_check: str = Field(description="Recommended maintenance or inspection follow-up")

class InspectionReport(BaseModel):
    findings: List[Observation] = Field(description="List of visual findings")


# --- Core Vision Service ---

class VisionService:
    def __init__(self):
        # We don't initialize PaddleOCR here to keep it lazy-loaded
        self._paddle_ocr = None

    def _get_paddle_ocr(self):
        if self._paddle_ocr is None:
            # Lazy load paddleocr to avoid heavy startup penalty
            from paddleocr import PaddleOCR
            self._paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en')
        return self._paddle_ocr

    def _encode_image(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
            
    async def _get_llm(self):
        await _ensure_model_running("vl")
        return ChatOpenAI(
            base_url=settings.VLLM_BASE_URL,
            api_key=settings.VLLM_API_KEY,
            model=settings.VLLM_MODEL_VL,
            temperature=0.0
        )

    async def analyze_image(self, image_path: str, instruction: str) -> ImageAnalysisResponse:
        base64_img = self._encode_image(image_path)
        llm = await self._get_llm()
        llm_structured = llm.with_structured_output(ImageAnalysisResponse)
        
        msg = HumanMessage(content=[
            {"type": "text", "text": instruction},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
        ])
        return await llm_structured.ainvoke([msg])

    async def analyze_multiple_images(self, image_paths: List[str], instruction: str) -> ImageAnalysisResponse:
        llm = await self._get_llm()
        llm_structured = llm.with_structured_output(ImageAnalysisResponse)
        
        content = [{"type": "text", "text": instruction}]
        for path in image_paths:
            base64_img = self._encode_image(path)
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}})
            
        msg = HumanMessage(content=content)
        return await llm_structured.ainvoke([msg])

    async def extract_visual_text(self, image_path: str, mode: Literal['qwen', 'paddle']) -> VisualTextExtraction:
        if mode == 'paddle':
            ocr = self._get_paddle_ocr()
            result = ocr.ocr(image_path, cls=True)
            
            # Extract raw text from PaddleOCR result
            raw_text = []
            if result and result[0]:
                for line in result[0]:
                    raw_text.append(line[1][0])
            
            paddle_text = "\n".join(raw_text)
            
            # Use Qwen to structure the PaddleOCR output
            llm = await self._get_llm()
            llm_structured = llm.with_structured_output(VisualTextExtraction)
            prompt = (
                f"Extract the requested fields from this raw OCR text. If a field is missing, output 'Not readable'.\n\n"
                f"RAW OCR TEXT:\n{paddle_text}"
            )
            return await llm_structured.ainvoke([HumanMessage(content=prompt)])
        
        else:
            # Mode = Qwen
            base64_img = self._encode_image(image_path)
            llm = await self._get_llm()
            llm_structured = llm.with_structured_output(VisualTextExtraction)
            
            msg = HumanMessage(content=[
                {"type": "text", "text": "Extract text and information from this image. If a field is missing or unreadable, output 'Not readable'."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
            ])
            return await llm_structured.ainvoke([msg])

    async def analyze_diagram(self, image_path: str, instruction: str) -> DiagramAnalysis:
        base64_img = self._encode_image(image_path)
        llm = await self._get_llm()
        llm_structured = llm.with_structured_output(DiagramAnalysis)
        
        msg = HumanMessage(content=[
            {"type": "text", "text": instruction},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
        ])
        return await llm_structured.ainvoke([msg])

    async def inspect_image(self, image_path: str) -> InspectionReport:
        base64_img = self._encode_image(image_path)
        llm = await self._get_llm()
        llm_structured = llm.with_structured_output(InspectionReport)
        
        prompt = (
            "Perform a visual inspection of this equipment/image. "
            "Only report visually observable conditions. Do not diagnose hidden/internal failure. "
            "Do not invent measurements."
        )
        
        msg = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
        ])
        return await llm_structured.ainvoke([msg])

    async def vision_grounding(self, image_path: str, question: str) -> str:
        base64_img = self._encode_image(image_path)
        llm = await self._get_llm()
        
        prompt = (
            f"Question: {question}\n"
            "If the information is unreadable or not visible in the image, explicitly state that it is not readable or not visible. "
            "Do not hallucinate or guess."
        )
        
        msg = HumanMessage(content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_img}"}}
        ])
        
        response = await llm.ainvoke([msg])
        return response.content

# Singleton instance
vision_service = VisionService()
