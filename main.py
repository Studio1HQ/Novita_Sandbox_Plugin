import os
import json
from fastapi import FastAPI
from pydantic import BaseModel
from novita_sandbox.code_interpreter import Sandbox
from openai import OpenAI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ---------------------------------------------
# Initial Setup
# ---------------------------------------------

client = OpenAI(
    base_url="https://api.novita.ai/openai",
    api_key=os.environ["NOVITA_API_KEY"],
)

model = "meta-llama/llama-3.3-70b-instruct"

tools = [
    {
        "type": "function",
        "function": {
            "name": "run_commands",
            "description": "Run a single shell command inside the sandbox working directory",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string"},
                },
                "required": ["command"],
            },
        },
    },
]

# ---------------------------------------------
# HTTP Server Setup
# ---------------------------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

# ---------------------------------------------
# Chat Endpoint
# ---------------------------------------------

@app.post("/chat")
def chat(req: ChatRequest):
    print("[LOG] New chat request received")
    messages = [{"role": "user", "content": req.message}]

    # Create a fresh sandbox for this request
    sandbox = Sandbox.create()
    print("[LOG] Sandbox created")

    def run_commands(command: str):
        print(f"[LOG] run_commands called with: {command}")
        try:
            result = sandbox.commands.run(command)
            print(f"[LOG] run_commands result: {result.stdout}")
            return result.stdout
        except Exception as e:
            print(f"[LOG] run_commands error: {e}")
            return f"Error running command: {e}"

    # Send to model
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        tools=tools,
    )

    assistant_msg = response.choices[0].message
    messages.append(assistant_msg)

    tool_outputs = []

    if assistant_msg.tool_calls:
        for tool_call in assistant_msg.tool_calls:
            fn_name = tool_call.function.name
            fn_args = json.loads(tool_call.function.arguments)
            print(f"[LOG] Tool call detected: {fn_name} with args {fn_args}")

            if fn_name == "run_commands":
                result = run_commands(**fn_args)
            else:
                result = f"Error: Unknown tool {fn_name}"

            tool_outputs.append(result)

            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "content": str(result),
            })

        # Follow-up after tool execution
        follow_up = client.chat.completions.create(
            model=model,
            messages=messages,
        )
        final_answer = follow_up.choices[0].message
        messages.append(final_answer)
        reply = final_answer.content
    else:
        reply = assistant_msg.content

    # Kill the sandbox after the request
    sandbox.kill()
    print("[LOG] Sandbox killed")

    return {"reply": reply, "tool_output": tool_outputs}

# ---------------------------------------------
# Run server
# ---------------------------------------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
