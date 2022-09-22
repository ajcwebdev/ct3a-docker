import { prisma } from "../db/client"
import { createRouter } from "./context"

export const postRouter = createRouter()
  .query('all', {
    async resolve() {
      return prisma.post.findMany()
    },
  })