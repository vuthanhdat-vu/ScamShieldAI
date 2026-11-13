import { PreprocessingService } from '../src/preprocessing/preprocessing.service';
import {
  OcrResult,
  OcrTurn,
} from '../src/preprocessing/preprocessing.interfaces';
import {
  cleanText,
  denoiseText,
  stripInvisibleChars,
  transcodeMathMonospace,
  reconstructSpacedUrls,
  unStutterText,
  repairTelexTypos,
  normalizeSlang,
  RISK_PRESERVED_STOPWORDS,
} from '../src/preprocessing/text-cleaner';

describe('PreprocessingService & TextCleaner', () => {
  let service: PreprocessingService;

  beforeEach(() => {
    service = new PreprocessingService();
  });

  describe('Invisible & Zero-Width Characters Stripping', () => {
    it('strips zero-width spaces, joiners, Hangul fillers, and directional markers', () => {
      const input = 'c\u200Bo\u200Bn\u200Bg\u200B \u200Ba\u200Bn \u3164b\uFFA0a\u00ADn\u202Ek';
      const cleaned = stripInvisibleChars(input);
      expect(cleaned).toBe('cong an bank');
    });
  });

  describe('Mathematical Monospace Font Transcoding', () => {
    it('transcodes monospace letters and digits to ASCII', () => {
      // 𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘 -> kyhgslvao
      const input = 'Truy cập 𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘 để nhận [MONEY]';
      const output = transcodeMathMonospace(input);
      expect(output).toBe('Truy cập kyhgslvao để nhận [MONEY]');
    });

    it('transcodes monospace numbers U+1D7F6-U+1D7FF', () => {
      // 𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿 -> 0123456789
      const input = 'STK: \u{1D7F6}\u{1D7F7}\u{1D7F8}\u{1D7F9}\u{1D7FA}';
      const output = transcodeMathMonospace(input);
      expect(output).toBe('STK: 01234');
    });
  });

  describe('Spaced-out Broken URL Reconstruction', () => {
    it('reconstructs malformed schemes and spaced domain dots', () => {
      const input = 'Truy cập http : // techcom-rewards-vn .com .vn để nhận thưởng';
      const { text, modified } = reconstructSpacedUrls(input);
      expect(modified).toBe(true);
      expect(text).toBe(
        'Truy cập http://techcom-rewards-vn.com.vn để nhận thưởng',
      );
    });

    it('removes spaces after scheme like http:// domain', () => {
      const input = 'https:// fake-portal.com/login';
      const { text } = reconstructSpacedUrls(input);
      expect(text).toBe('https://fake-portal.com/login');
    });
  });

  describe('Phonotactic Un-stuttering', () => {
    it('compresses alternating case pairs and repetitions >= 3', () => {
      const input = 'NhHậẬnNLLLuUôônnNNN [MONEY] trước 16h';
      const { text } = unStutterText(input);
      expect(text).toBe('NhậnLuôn [MONEY] trước 16h');
    });

    it('vaults CCCD acronym so 3 c letters are not crushed into cd', () => {
      const input = 'Cung cấp cccd và ccccd khẩn cấp';
      const { text } = unStutterText(input);
      expect(text).toContain('cccd');
      expect(text).not.toMatch(/(?<![a-zA-Z])cd(?![a-zA-Z])/);
    });

    it('compresses double accented vowels ââ, êê, ôô', () => {
      const input = 'mau mau chuyển tiềền ôô';
      const { text } = unStutterText(input);
      expect(text).toContain('tiền');
      expect(text).toContain('ô');
    });
  });

  describe('Telex Typo Repair', () => {
    it('converts dd/DD to đ/Đ, aa to â, ee to ê, oo to ô', () => {
      const input = 'ddang ky nhan thuong tai he thong';
      const output = repairTelexTypos(input);
      expect(output).toContain('đang');
    });

    it('preserves natural Vietnamese double vowels xoong, boong, coong, moong', () => {
      const input = 'Cái xoong này trên boong tàu coong coong';
      const output = repairTelexTypos(input);
      expect(output).toBe('Cái xoong này trên boong tàu coong coong');
    });
  });

  describe('Vietnamese SMS Slang Normalization & Unicode Boundaries', () => {
    it('replaces slang words using Unicode lookaround boundaries', () => {
      const input = 'ddang nhap tk vneid va nhap mk de xacthuc, neu k se bi khoa';
      const output = cleanText(input);
      expect(output).toContain('tài khoản');
      expect(output).toContain('VNeID');
      expect(output).toContain('mật khẩu');
      expect(output).toContain('xác thực');
      expect(output).toContain('không');
    });

    it('does NOT replace nh inside accented words like nhận', () => {
      const input = 'Tôi đã nhận được tiền';
      const output = normalizeSlang(input);
      expect(output).toBe('Tôi đã nhận được tiền');
      expect(output).not.toContain('ngân hàngận');
    });

    it('protects currency suffix 500k from being replaced with 500 không', () => {
      const input = 'Chuyển khoản 500k qua số tài khoản 12345678, em k biết';
      const output = cleanText(input);
      expect(output).toContain('500k');
      expect(output).toContain('em không biết');
      expect(output).not.toContain('500 không');
    });
  });

  describe('Risk-Preserving Stopword Retention', () => {
    it('preserves all conditional and urgency stopwords', () => {
      const input = 'Nếu không nộp phạt ngay thì tài khoản phải bị khóa trước 17h';
      const output = cleanText(input);
      for (const word of ['Nếu', 'ngay', 'thì', 'phải', 'khóa', 'trước']) {
        expect(output.toLowerCase()).toContain(word.toLowerCase());
      }
    });

    it('contains authoritative list of preserved risk keywords', () => {
      expect(RISK_PRESERVED_STOPWORDS).toContain('nếu');
      expect(RISK_PRESERVED_STOPWORDS).toContain('thì');
      expect(RISK_PRESERVED_STOPWORDS).toContain('ngay');
      expect(RISK_PRESERVED_STOPWORDS).toContain('phải');
      expect(RISK_PRESERVED_STOPWORDS).toContain('trước');
      expect(RISK_PRESERVED_STOPWORDS).toContain('trong');
    });
  });

  describe('100% Placeholder Preservation Invariant', () => {
    it('preserves [MONEY], [NUMBER], [TIME] completely intact through denoiseText', () => {
      const input = 'Số tiền [MONEY] vào lúc [TIME] mã số [NUMBER]';
      const result = denoiseText(input);
      expect(result.cleanedText).toBe('Số tiền [MONEY] vào lúc [TIME] mã số [NUMBER]');
    });
  });

  describe('PreprocessingService.cleanAndSanitize', () => {
    it('filters out system chips from dialogue turns', () => {
      const ocrResult: OcrResult = {
        turns: [
          { speaker: 'system', text: 'Hôm nay 10:30', imageIndex: 0, confidence: 0.99 },
          {
            speaker: 'peer',
            text: 'Chào bạn, STK: 123456789012 chuyển [MONEY] nhé',
            imageIndex: 0,
            confidence: 0.95,
          },
          { speaker: 'system', text: 'Tin nhắn đã được mã hóa', imageIndex: 0, confidence: 0.98 },
          {
            speaker: 'user',
            text: 'Đã nhận, tôi sẽ gửi tiền ngay',
            imageIndex: 0,
            confidence: 0.96,
          },
        ],
        fullTranscript: 'Hôm nay 10:30\nChào bạn...',
        imageCount: 1,
      };

      const result = service.cleanAndSanitize(ocrResult);

      expect(result.turns).toHaveLength(2);
      expect(result.turns[0].speaker).toBe('peer');
      expect(result.turns[0].text).toContain('<MASKED_BANK_ACC_1>');
      expect(result.turns[0].text).toContain('[MONEY]');
      expect(result.turns[1].speaker).toBe('user');
      expect(result.turns[1].text).toBe('Đã nhận, tôi sẽ gửi tiền ngay');
    });

    it('formats prompt text with [Peer]: and [User]: headers', () => {
      const ocrResult: OcrResult = {
        turns: [
          {
            speaker: 'peer',
            text: 'Cung cấp CCCD 001099012345 để xác minh tk',
            imageIndex: 0,
            confidence: 0.95,
          },
          {
            speaker: 'user',
            text: 'Số CCCD của tôi là 001099012345',
            imageIndex: 0,
            confidence: 0.97,
          },
        ],
        fullTranscript: '',
        imageCount: 1,
      };

      const result = service.cleanAndSanitize(ocrResult);

      expect(result.formattedPromptText).toContain(
        '[Peer]: Cung cấp căn cước công dân <MASKED_CCCD_1> để xác minh tài khoản',
      );
      expect(result.formattedPromptText).toContain(
        '[User]: Số căn cước công dân của tôi là <MASKED_CCCD_1>',
      );
      // Consistent token mapping between peer and user
      expect(result.sanitizedPiiCount).toBe(2);
    });

    it('handles empty or undefined OCR result gracefully', () => {
      const emptyResult: OcrResult = {
        turns: [],
        fullTranscript: '',
        imageCount: 0,
      };

      const result = service.cleanAndSanitize(emptyResult);

      expect(result.turns).toEqual([]);
      expect(result.formattedPromptText).toBe('');
      expect(result.sanitizedPiiCount).toBe(0);
    });
  });
});
