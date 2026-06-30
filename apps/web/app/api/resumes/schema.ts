import { z } from "zod";

export const resumeGenerateRequestSchema = z.object({
  userId: z.string().min(1).optional(),
  jobId: z.string().min(1),
  companyId: z.string().min(1),
  applicationPacketId: z.string().min(1),
  resumeVersionId: z.string().min(1).optional(),
  verifiedFacts: z.array(z.string().min(1)).min(1),
  targetRole: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  jobDescription: z.string().min(1).optional(),
  targetKeywords: z.array(z.string().min(1)).optional()
});
