import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createContact, deleteContact, findContactsByNamePrefix, findContactsByPhonePrefix, listContacts, updateContact } from "./db";

const contactInput = z.object({ name: z.string().trim().min(1).max(160), role: z.string().trim().max(160).optional(), email: z.string().email().max(320), phone: z.string().trim().max(64).optional(), company: z.string().trim().max(160).optional(), notes: z.string().max(5000).optional() });
const contactId = z.object({ id: z.number().int().positive() });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  contacts: router({
    list: protectedProcedure.query(({ ctx }) => listContacts(ctx.user.id)),
    create: protectedProcedure.input(contactInput).mutation(({ ctx, input }) => createContact({ ...input, userId: ctx.user.id })),
    update: protectedProcedure.input(contactId.merge(contactInput.partial())).mutation(({ ctx, input }) => { const { id, ...data } = input; return updateContact(ctx.user.id, id, data); }),
    remove: protectedProcedure.input(contactId).mutation(({ ctx, input }) => deleteContact(ctx.user.id, input.id)),
    searchName: protectedProcedure.input(z.object({ q: z.string().trim().min(1).max(160) })).query(({ ctx, input }) => findContactsByNamePrefix(ctx.user.id, input.q.toLowerCase())),
    searchPhone: protectedProcedure.input(z.object({ q: z.string().trim().min(1).max(64) })).query(({ ctx, input }) => findContactsByPhonePrefix(ctx.user.id, input.q.replace(/[^0-9+]/g, ""))),
  }),
});
export type AppRouter = typeof appRouter;
