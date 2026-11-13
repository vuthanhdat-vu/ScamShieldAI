import { PiiSanitizer } from '../src/preprocessing/pii-sanitizer';

describe('PiiSanitizer', () => {
  let sanitizer: PiiSanitizer;

  beforeEach(() => {
    sanitizer = new PiiSanitizer();
  });

  describe('Rule 1: PASSWORD', () => {
    it('masks password with colon delimiter and preserves trailing punctuation', () => {
      const input = 'Vui lòng nhập mật khẩu: Admin@2026! để đăng nhập.';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Vui lòng nhập mật khẩu: <MASKED_PASSWORD_1>! để đăng nhập.',
      );
      expect(result.count).toBe(1);
    });

    it('masks password with equals delimiter and pwd keyword', () => {
      const input = 'mk=SuperSecretPass123';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe('mk= <MASKED_PASSWORD_1>');
      expect(result.count).toBe(1);
    });

    it('masks password following password keyword case-insensitively', () => {
      const input = 'Password: PassWord#999';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe('Password: <MASKED_PASSWORD_1>');
      expect(result.count).toBe(1);
    });
  });

  describe('Rule 2: PERSON_NAME_DOB', () => {
    it('masks coupled full name and date of birth', () => {
      const input = 'Xác minh hồ sơ của Le Thi Lan Anh_SN: 30/07/2006 khẩn cấp';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Xác minh hồ sơ của <MASKED_PERSON_NAME_1> khẩn cấp',
      );
      expect(result.count).toBe(1);
    });

    it('masks coupled name and DOB with honorific prefix', () => {
      const input = 'khach hang Nguyen Van An_SN: 15/01/1990 cần đối chiếu';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        '<MASKED_PERSON_NAME_1> cần đối chiếu',
      );
      expect(result.count).toBe(1);
    });
  });

  describe('Rule 3: BANK_ACCOUNT', () => {
    it('masks 8 to 16 digit bank accounts preceded by STK keyword', () => {
      const input = 'Chuyển tiền vào STK: 123456789012 để thanh toán';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Chuyển tiền vào STK: <MASKED_BANK_ACC_1> để thanh toán',
      );
      expect(result.count).toBe(1);
    });

    it('masks bank accounts with so tai khoan keyword and space', () => {
      const input = 'số tài khoản 987654321098 là của giám đốc';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'số tài khoản <MASKED_BANK_ACC_1> là của giám đốc',
      );
      expect(result.count).toBe(1);
    });

    it('masks bank accounts with tk keyword', () => {
      const input = 'tk: 0123456789';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe('tk: <MASKED_BANK_ACC_1>');
      expect(result.count).toBe(1);
    });
  });

  describe('Rule 4: OTP', () => {
    it('masks 6-digit OTP code with formal phrase', () => {
      const input = 'Ma OTP cua ban la: 482917 vui lòng không chia sẻ';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Ma OTP cua ban la: <MASKED_OTP_1> vui lòng không chia sẻ',
      );
      expect(result.count).toBe(1);
    });

    it('masks short OTP with colon', () => {
      const input = 'OTP: 123456';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe('OTP: <MASKED_OTP_1>');
      expect(result.count).toBe(1);
    });

    it('masks mã xác thực phrase', () => {
      const input = 'mã xác thực là 654321';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe('mã xác thực là <MASKED_OTP_1>');
      expect(result.count).toBe(1);
    });
  });

  describe('Rule 5: PHONE_NUMBER', () => {
    it('masks Vietnamese mobile number with domestic 0 prefix', () => {
      const input = 'Liên hệ lại qua số 0987654321 ngay';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Liên hệ lại qua số <MASKED_PHONE_NUMBER_1> ngay',
      );
      expect(result.count).toBe(1);
    });

    it('masks Vietnamese mobile number with +84 prefix', () => {
      const input = 'Gọi +84912345678 để nhận quà';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Gọi <MASKED_PHONE_NUMBER_1> để nhận quà',
      );
      expect(result.count).toBe(1);
    });

    it('does NOT mask institutional hotlines', () => {
      const input = 'Gọi 113, 114, 115 hoặc 198 để báo cáo khẩn cấp';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Gọi 113, 114, 115 hoặc 198 để báo cáo khẩn cấp',
      );
      expect(result.count).toBe(0);
    });
  });

  describe('Rule 6: CCCD', () => {
    it('masks 12-digit BCA format citizen ID', () => {
      const input = 'Cung cấp số CCCD 001099012345 của bạn';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Cung cấp số CCCD <MASKED_CCCD_1> của bạn',
      );
      expect(result.count).toBe(1);
    });

    it('masks 14-digit BCA test card variant', () => {
      const input = 'Mã định danh 00119012345678 đã duyệt';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Mã định danh <MASKED_CCCD_1> đã duyệt',
      );
      expect(result.count).toBe(1);
    });
  });

  describe('Strict Precedence Invariant: BANK_ACCOUNT before CCCD', () => {
    it('ensures 12-digit bank accounts are masked as BANK_ACC and not CCCD', () => {
      const input = 'STK: 123456789012 kèm CCCD 001099012345';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'STK: <MASKED_BANK_ACC_1> kèm CCCD <MASKED_CCCD_1>',
      );
      expect(result.count).toBe(2);
      // Explicit assertion: BANK_ACC_1 is the 12-digit account, CCCD_1 is the national ID
      expect(result.sanitizedText).not.toContain('<MASKED_CCCD_2>');
    });
  });

  describe('Session-Scoped Salted HMAC-SHA256 Consistency', () => {
    it('maps identical raw PII across multiple turns to the exact same token index', () => {
      const turn1 = sanitizer.sanitize('Chuyển tiền vào STK: 1234567890');
      const turn2 = sanitizer.sanitize('Hoặc chuyển vào STK: 9876543210');
      const turn3 = sanitizer.sanitize('Nhắc lại, hãy gửi tới STK: 1234567890 ngay');

      expect(turn1.sanitizedText).toBe('Chuyển tiền vào STK: <MASKED_BANK_ACC_1>');
      expect(turn2.sanitizedText).toBe('Hoặc chuyển vào STK: <MASKED_BANK_ACC_2>');
      expect(turn3.sanitizedText).toBe(
        'Nhắc lại, hãy gửi tới STK: <MASKED_BANK_ACC_1> ngay',
      );

      const refs = sanitizer.getReferences();
      expect(refs).toHaveLength(2);
      expect(refs[0].token).toBe('<MASKED_BANK_ACC_1>');
      expect(refs[1].token).toBe('<MASKED_BANK_ACC_2>');
    });

    it('formats phone numbers consistently even with spaces or hyphens', () => {
      const t1 = sanitizer.sanitize('SĐT: 0987654321');
      const t2 = sanitizer.sanitize('Gọi số 0987654321');
      expect(t1.sanitizedText).toContain('<MASKED_PHONE_NUMBER_1>');
      expect(t2.sanitizedText).toContain('<MASKED_PHONE_NUMBER_1>');
    });
  });

  describe('100% Placeholder Preservation Invariant', () => {
    it('preserves [MONEY], [NUMBER], [TIME] completely intact', () => {
      const input = 'Gửi [MONEY] vào STK 1234567890 trước [TIME] mã [NUMBER]';
      const result = sanitizer.sanitize(input);
      expect(result.sanitizedText).toBe(
        'Gửi [MONEY] vào STK <MASKED_BANK_ACC_1> trước [TIME] mã [NUMBER]',
      );
      expect(result.sanitizedText).toContain('[MONEY]');
      expect(result.sanitizedText).toContain('[NUMBER]');
      expect(result.sanitizedText).toContain('[TIME]');
    });
  });

  describe('sanitizeTurns', () => {
    it('sanitizes an array of dialogue turns with persistent state', () => {
      const turns: Array<{ speaker: 'peer' | 'user'; text: string; imageIndex: number }> = [
        {
          speaker: 'peer',
          text: 'Vui lòng cung cấp CCCD 001099012345',
          imageIndex: 0,
        },
        {
          speaker: 'user',
          text: 'Tôi đã chuyển tiền qua STK 1234567890 rồi',
          imageIndex: 0,
        },
        {
          speaker: 'peer',
          text: 'Chưa thấy, hãy chuyển lại STK 1234567890 hoặc gọi 0987654321',
          imageIndex: 1,
        },
      ];

      const { turns: resTurns, totalPiiCount } = sanitizer.sanitizeTurns(turns);

      expect(totalPiiCount).toBe(4);
      expect(resTurns[0].text).toBe('Vui lòng cung cấp CCCD <MASKED_CCCD_1>');
      expect(resTurns[1].text).toBe(
        'Tôi đã chuyển tiền qua STK <MASKED_BANK_ACC_1> rồi',
      );
      expect(resTurns[2].text).toBe(
        'Chưa thấy, hãy chuyển lại STK <MASKED_BANK_ACC_1> hoặc gọi <MASKED_PHONE_NUMBER_1>',
      );
    });
  });

  describe('Edge cases', () => {
    it('handles empty string gracefully', () => {
      expect(sanitizer.sanitize('')).toEqual({ sanitizedText: '', count: 0 });
    });

    it('leaves text without PII untouched', () => {
      const text = 'Xin chào, bạn cần trợ giúp điều gì hôm nay?';
      expect(sanitizer.sanitize(text)).toEqual({ sanitizedText: text, count: 0 });
    });
  });
});
