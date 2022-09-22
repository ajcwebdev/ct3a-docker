import superjson from "superjson"
import { createRouter } from "./context"
import { exampleRouter } from "./example"
import { postRouter } from "./post"

export const appRouter = createRouter()
  .transformer(superjson)
  .merge("example.", exampleRouter)
  .merge("post.", postRouter)

export type AppRouter = typeof appRouter