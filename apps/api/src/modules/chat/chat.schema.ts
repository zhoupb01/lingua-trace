import type { AgentInputItem } from "@openai/agents"
import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// A conversation. The Agents SDK models a chat as a list of history items (see
// `messages`); a session groups them and tracks ownership.
export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: text("user_id").notNull(),
        title: text("title"), // null until set (e.g. from the first user message)
        // Last OpenAI Responses-API response id for this session. Lets a turn send
        // only the new message with `previous_response_id` instead of replaying the
        // whole history. Null = first turn / pre-migration / Chat-Completions mode /
        // expired chain → fall back to sending full history (see chat.tasks.ts).
        lastResponseId: text("last_response_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("sessions_user_id_idx").on(t.userId, t.createdAt)],
)

// One SDK history item (AgentInputItem — a user/assistant message, a tool call, or
// a tool output; each is self-describing). The loop emits several items per turn in
// quick succession, so order by a monotonic `seq`, not by time. `item` is stored
// verbatim as JSONB so the session replays straight back into run().
export const messages = pgTable(
    "messages",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        sessionId: uuid("session_id")
            .notNull()
            .references(() => sessions.id, { onDelete: "cascade" }),
        seq: bigserial("seq", { mode: "number" }).notNull(),
        item: jsonb("item").$type<AgentInputItem>().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("messages_session_id_idx").on(t.sessionId, t.seq)],
)
