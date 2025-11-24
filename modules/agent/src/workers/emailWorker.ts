import sgMail from '@sendgrid/mail';
import { createAgent } from '../lib/agent.js';
import { WorkerResult } from '../models.js';
import { EMAIL_WORKER_PROMPT } from '../prompts/workers/email.js';

const apiKey = process.env.SENDGRID_API_KEY ?? '';
const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@example.com';

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const agent = createAgent({
  name: 'EmailWorker',
  instructions: EMAIL_WORKER_PROMPT,
  model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
});

interface SendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

const sendEmail = async (
  to: string,
  subject: string,
  body: string
): Promise<SendResult> => {
  if (!apiKey) {
    return { success: false, error: 'SENDGRID_API_KEY not configured' };
  }

  try {
    const [response] = await sgMail.send({
      to,
      from: fromEmail,
      subject,
      text: body,
    });

    return {
      success: true,
      statusCode: response.statusCode,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMsg };
  }
};

export const executeEmail = async (
  taskDescription: string,
  parameters: Record<string, unknown>,
  feedback?: string
): Promise<WorkerResult> => {
  console.log('📧 EMAIL_WORKER: Starting execution');
  console.log(`   Task: ${taskDescription.slice(0, 80)}...`);
  console.log(`   To: ${parameters.to ?? 'Not specified'}`);
  if (feedback) {
    console.log('   With feedback from previous attempt');
  }

  try {
    const feedbackSection = feedback ? `Previous feedback to address: ${feedback}` : '';
    const context = `Task: ${taskDescription}

Parameters provided:
- To: ${parameters.to ?? 'Not specified'}
- Subject: ${parameters.subject ?? 'Not specified'}
- Body: ${parameters.body ?? 'Not specified'}

${feedbackSection}

Compose the email and confirm it's ready to send. Return a JSON with to, subject, and body fields.`;

    const result = await agent.run(context);

    const to = (parameters.to as string) ?? '';
    const subject = (parameters.subject as string) ?? '';
    const body = (parameters.body as string) ?? result.finalOutput;

    console.log(`📧 EMAIL_WORKER: Sending to ${to}`);
    const sendResult = await sendEmail(to, subject, body);

    if (!sendResult.success) {
      console.error(`❌ EMAIL_WORKER: Send failed: ${sendResult.error}`);
      return {
        success: false,
        output: '',
        error: sendResult.error ?? 'Unknown error',
      };
    }

    console.log(`✓ EMAIL_WORKER: Sent successfully (status: ${sendResult.statusCode})`);
    return {
      success: true,
      output: `Email sent successfully to ${to}\nSubject: ${subject}\nStatus: ${sendResult.statusCode}`,
      error: null,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ EMAIL_WORKER: Failed with error: ${errorMsg}`);
    return {
      success: false,
      output: '',
      error: errorMsg,
    };
  }
};
