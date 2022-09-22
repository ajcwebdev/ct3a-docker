import superjson from "superjson"
import { createRouter } from "./context"
import { postRouter } from "./post"

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("post.", postRouter)

export type AppRouter = typeof appRouter