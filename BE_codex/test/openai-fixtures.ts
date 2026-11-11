import type { Response } from 'openai/resources/responses/responses';
import type { OpenAiAnalysisOutput } from '../src/ai/openai-analysis-output';
import { ScamCategory, SignalType } from '../src/contracts/analysis.enums';

export const otpOutput: OpenAiAnalysisOutput = {
  canAssess: true,
  suggestedCategory: ScamCategory.OTP_THEFT,
  summary: 'Tin nhắn yêu cầu cung cấp mã OTP.',
  evidence: [{
    quote: 'Send OTP',
    reason: 'Tin nhắn yêu cầu mã xác thực.',
    signalType: SignalType.CREDENTIAL_REQUEST,
    imageIndex: null,
  }],
  speechSummary: 'Không cung cấp mã OTP.',
};

export function sdkResponse(output: unknown = otpOutput, status: Response['status'] = 'completed'): Response {
  const text = JSON.stringify(output);
  return {
    id: 'resp_offline',
    object: 'response',
    model: 'offline-model',
    created_at: 0,
    access_programs: null,
    output_text: text,
    status,
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    parallel_tool_calls: false,
    temperature: null,
    top_p: null,
    tool_choice: 'none',
    tools: [],
    output: [{
      id: 'msg_offline',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text, annotations: [] }],
    }],
  };
}
