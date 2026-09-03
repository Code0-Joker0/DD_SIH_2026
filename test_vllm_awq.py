import os

# 1. Environment Variables (Must be set before importing vLLM)
os.environ["VLLM_USE_FLASHINFER_SAMPLER"] = "0"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "expandable_segments:True"

from vllm import LLM, SamplingParams

def run_chat_interface():
    model_id = "Qwen/Qwen2.5-Coder-7B-Instruct-AWQ"
    
    print(f"Loading {model_id} into vLLM engine...")
    print("This might take a moment. Please wait...\n")

    # 2. Initialize the LLM Engine
    llm = LLM(
        model=model_id,
        quantization="awq",
        tensor_parallel_size=1,
        max_model_len=8192,
        gpu_memory_utilization=0.85,
        trust_remote_code=True
    )

    # Fetch the tokenizer to handle the chat template correctly
    tokenizer = llm.get_tokenizer()

    # 3. Configure Sampling Parameters
    # Adjusted slightly for chat: a bit more max_tokens for comprehensive code blocks
    sampling_params = SamplingParams(
        temperature=0.2, 
        top_p=0.95, 
        max_tokens=2048,
        stop_token_ids=[tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|im_end|>")]
    )

    # 4. Initialize Conversation History
    messages = [
        {"role": "system", "content": "You are a senior Python software engineer. You provide clean, well-documented, and production-ready code. You are direct and concise."}
    ]

    print("="*60)
    print("🚀 Chat Interface Ready!")
    print("Type your coding questions below. Type 'quit', 'exit', or 'q' to stop.")
    print("="*60)

    # 5. Interactive Chat Loop
    while True:
        try:
            user_input = input("\n🧑‍💻 You: ")
        except (EOFError, KeyboardInterrupt):
            print("\nExiting chat...")
            break
            
        if user_input.strip().lower() in ['quit', 'exit', 'q']:
            print("Exiting chat...")
            break
            
        if not user_input.strip():
            continue

        # Append the new user message to the history
        messages.append({"role": "user", "content": user_input})

        # Apply the Qwen ChatML template to the entire conversation history
        prompt = tokenizer.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )

        # Generate the response (use_tqdm=False hides the progress bar for a cleaner UI)
        outputs = llm.generate([prompt], sampling_params, use_tqdm=False)
        response_text = outputs[0].outputs[0].text.strip()

        print(f"\n🤖 Qwen Coder:\n{response_text}")

        # Append the assistant's response to the history so it remembers for the next turn
        messages.append({"role": "assistant", "content": response_text})

if __name__ == "__main__":
    run_chat_interface()
