import { beforeAll, describe, expect, test } from "bun:test"
import { tools } from "@api/modules/chat/chat.tools"
import {
    Agent,
    type AgentOutputItem,
    type Model,
    type ModelRequest,
    type ModelResponse,
    run,
    type StreamEvent,
    setTracingDisabled,
    Usage,
    user,
} from "@openai/agents"

// The SDK runs the loop; we test the agent + tools offline by handing the Agent a
// scripted fake model — no network, deterministic. Tracing would try to phone home,
// so disable it for the test.
beforeAll(() => setTracingDisabled(true))

// Turn 1: the model calls `get_time`. Turn 2 (after the SDK ran the tool and fed
// the result back): the model returns a final text answer.
function fakeModel(): Model {
    let turn = 0
    return {
        async getResponse(_req: ModelRequest): Promise<ModelResponse> {
            turn++
            const output: AgentOutputItem[] =
                turn === 1
                    ? [
                          {
                              type: "function_call",
                              callId: "call_1",
                              name: "get_time",
                              arguments: "{}",
                              status: "completed",
                          },
                      ]
                    : [
                          {
                              type: "message",
                              role: "assistant",
                              status: "completed",
                              content: [{ type: "output_text", text: "done" }],
                          },
                      ]
            return { usage: new Usage(), output }
        },
        // Not exercised here (this test uses the non-streamed run()).
        getStreamedResponse(): AsyncIterable<StreamEvent> {
            throw new Error("streaming not implemented in fake model")
        },
    }
}

// A model that calls one named tool on turn 1, then returns a final message on turn 2
// (after the SDK ran the tool and fed the result back). Used to exercise a tool's
// error path without scripting the whole loop by hand.
function fakeModelCalling(name: string, args: string): Model {
    let turn = 0
    return {
        async getResponse(_req: ModelRequest): Promise<ModelResponse> {
            turn++
            const output: AgentOutputItem[] =
                turn === 1
                    ? [
                          {
                              type: "function_call",
                              callId: "call_1",
                              name,
                              arguments: args,
                              status: "completed",
                          },
                      ]
                    : [
                          {
                              type: "message",
                              role: "assistant",
                              status: "completed",
                              content: [{ type: "output_text", text: "done" }],
                          },
                      ]
            return { usage: new Usage(), output }
        },
        getStreamedResponse(): AsyncIterable<StreamEvent> {
            throw new Error("streaming not implemented in fake model")
        },
    }
}

describe("chat agent", () => {
    test("runs a tool call, then returns final text", async () => {
        const agent = new Agent({ name: "assistant", tools, model: fakeModel() })
        const result = await run(agent, [user("what time is it?")])

        expect(result.finalOutput).toBe("done")
        // The tool round-trip is captured in the replayable history.
        const types = result.history.map((i) => (i as { type?: string }).type)
        expect(types).toContain("function_call")
        expect(types).toContain("function_call_result")
    })

    test("a failing tool returns its error to the model, not crashing the run", async () => {
        // lookup_user throws for unknown ids; it catches and returns a string, so the
        // SDK feeds that to the model and the turn completes instead of erroring out.
        const agent = new Agent({
            name: "assistant",
            tools,
            model: fakeModelCalling("lookup_user", '{"id":"nope"}'),
        })
        const result = await run(agent, [user("look up nope")])

        expect(result.finalOutput).toBe("done")
        expect(JSON.stringify(result.history)).toContain("Could not look up")
    })
})
