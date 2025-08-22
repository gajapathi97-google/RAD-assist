// src/ai/flows/generate-comparative-report.ts
'use server';

/**
 * @fileOverview Generates a comparative report between pre and post-treatment DICOM images.
 *
 * - generateComparativeReport - A function that generates a comparative report.
 * - ComparativeReportInput - The input type for the generateComparativeReport function.
 * - ComparativeReportOutput - The return type for the generateComparativeReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ComparativeReportInputSchema = z.object({
  preTreatmentImage: z
    .string()
    .describe(
      'Pre-treatment DICOM image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  postTreatmentImage: z
    .string()
    .describe(
      'Post-treatment DICOM image as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type ComparativeReportInput = z.infer<typeof ComparativeReportInputSchema>;

const ComparativeReportOutputSchema = z.object({
  report: z.string().describe('The comparative report of the pre and post-treatment images.'),
});
export type ComparativeReportOutput = z.infer<typeof ComparativeReportOutputSchema>;

export async function generateComparativeReport(
  input: ComparativeReportInput
): Promise<ComparativeReportOutput> {
  return generateComparativeReportFlow(input);
}

const generateComparativeReportPrompt = ai.definePrompt({
  name: 'generateComparativeReportPrompt',
  input: {schema: ComparativeReportInputSchema},
  output: {schema: ComparativeReportOutputSchema},
  // CORRECTED PROMPT: Explicitly forcing raw Markdown string output.
  prompt: `You are an expert AI radiologist assistant. Your only task is to analyze the provided images and generate a single, raw Markdown string based on the template below.

**CRITICAL INSTRUCTIONS:**
1.  **DO NOT OUTPUT JSON.** Your entire response must be a single block of plain text formatted with Markdown.
2.  Analyze the provided images to fill in the bracketed placeholders \`[[FIELD_NAME:instruction]]\`.
3.  Replace the entire placeholder, including the brackets and instructions, with your findings.
4.  Preserve the exact structure, spacing, and Markdown syntax (like '**', '*', and '---') of the template.

**TEMPLATE TO FILL:**
---
**COMPARATIVE ANALYSIS DRAFT REPORT**
---

**Study Information:**
* Modality: [[MODALITY:Analyze images or state 'CT Abdomen/Pelvis with IV Contrast']]
* Indication: [[INDICATION:Analyze images or state 'Follow-up of HCC s/p TACE']]
* Comparison Study 1 (Pre-treatment):
    * Study Date: [[PRE_TREATMENT_DATE:Extract from metadata or use placeholder 'UNKNOWN']]
* Comparison Study 2 (Post-treatment):
    * Study Date: [[POST_TREATMENT_DATE:Extract from metadata or use placeholder 'UNKNOWN']]

---
**Findings:**
<<START_SECTION_FINDINGS>>
**LIVER:**
* Pre-treatment:
  * Presence of a dominant Hepatocellular Carcinoma (HCC) lesion located in the liver [[LIVER_SEGMENT_PRE:Identify liver lobe and segment]]. It appears as a large, well-defined mass measuring approximately [[SIZE_PRE:Measure longest axial diameter in cm]] in axial diameter. [[PRE_TREATMENT_DESCRIPTION:Briefly describe lesion morphology, enhancement, and washout characteristics.]]
* Post-treatment:
  * The previously described HCC lesion now measures approximately [[SIZE_POST:Measure longest axial diameter in cm]] in axial diameter. [[POST_TREATMENT_DESCRIPTION:Describe changes in enhancement, necrosis, and any new lesions.]]
<<END_SECTION_FINDINGS>>

---
**Quantitative Assessment:**
* Target Lesion (HCC):
    * Location: [[HCC_LOCATION:Confirm liver lobe and segment]]
    * Pre-treatment Size (Longest Diameter): [[SIZE_PRE_QA:Repeat pre-treatment size]]
    * Post-treatment Size (Longest Diameter): [[SIZE_POST_QA:Repeat post-treatment size]]
    * Percentage Change in Size: [[PERCENTAGE_CHANGE:Calculate [(Pre-Post)/Pre]*100 and format as a percentage]]
    * Qualitative Changes: [[QUALITATIVE_CHANGES:Summarize changes like necrosis and enhancement.]]

---
**Impression:**
* Overall Treatment Response: The current findings are [[TREATMENT_RESPONSE:State suggestive response (e.g., partial response, stable disease)]] following TACE treatment, primarily based on a [[PERCENTAGE_CHANGE_IMPRESSION:Repeat percentage change]] decrease in the longest axial diameter of the dominant HCC in [[HCC_LOCATION_IMPRESSION:Repeat location]] and evidence of [[NECROSIS_EVIDENCE:Summarize evidence of necrosis]].
* [[IMPRESSION_DETAILS:Comment on residual viable tumor and need for follow-up.]]
* Recommendations: [[RECOMMENDATIONS:Recommend a specific follow-up imaging modality and timeframe.]]

---
**Patient Information:**
* Patient Name: [[PATIENT_NAME:Use placeholder 'UNKNOWN']]
* DOB: [[DOB:Use placeholder 'UNKNOWN']]
* MRN: [[MRN:Use placeholder 'UNKNOWN']]

---
**Disclaimer:** This report is an AI-generated draft for assisting radiologists. It is based on image analysis and publicly available knowledge, and *does not constitute a final medical diagnosis or substitute for professional medical judgment*. All findings and interpretations must be independently reviewed, verified, and finalized by a qualified human radiologist.
---

Now, analyze these images and generate the report as a single raw Markdown string.

Pre-treatment Image: {{media url=preTreatmentImage}}
Post-treatment Image: {{media url=postTreatmentImage}}
`,
});

const generateComparativeReportFlow = ai.defineFlow(
  {
    name: 'generateComparativeReportFlow',
    inputSchema: ComparativeReportInputSchema,
    outputSchema: ComparativeReportOutputSchema,
  },
  async input => {
    const {output} = await generateComparativeReportPrompt(input);
    return output!;
  }
);
