import { encrypt, decrypt } from '@/lib/crypto'

const TEST_KEY = 'a'.repeat(64) // 64자 hex = 32 bytes

describe('crypto', () => {
  beforeEach(() => {
    process.env.COOKIE_ENCRYPTION_KEY = TEST_KEY
  })

  afterEach(() => {
    delete process.env.COOKIE_ENCRYPTION_KEY
  })

  describe('encrypt', () => {
    it('문자열을 암호화하여 hex:hex:hex 형식을 반환해야 한다', () => {
      const result = encrypt('hello world')
      const parts = result.split(':')
      expect(parts).toHaveLength(3)
      parts.forEach(p => expect(p).toMatch(/^[0-9a-f]+$/))
    })

    it('동일한 입력에 대해 매번 다른 암호문을 반환해야 한다 (IV 랜덤성)', () => {
      const a = encrypt('same input')
      const b = encrypt('same input')
      expect(a).not.toBe(b)
    })

    it('COOKIE_ENCRYPTION_KEY 없으면 에러를 던져야 한다', () => {
      delete process.env.COOKIE_ENCRYPTION_KEY
      expect(() => encrypt('test')).toThrow('COOKIE_ENCRYPTION_KEY')
    })

    it('잘못된 길이의 키는 에러를 던져야 한다', () => {
      process.env.COOKIE_ENCRYPTION_KEY = 'short'
      expect(() => encrypt('test')).toThrow('64자 hex')
    })
  })

  describe('decrypt', () => {
    it('암호화된 문자열을 복호화하여 원문을 반환해야 한다', () => {
      const plaintext = '{"sessionKey":"sk-ant-test","orgId":"abc-123"}'
      const encrypted = encrypt(plaintext)
      expect(decrypt(encrypted)).toBe(plaintext)
    })

    it('잘못된 형식의 암호문은 에러를 던져야 한다', () => {
      expect(() => decrypt('invalid')).toThrow('잘못된 암호문 형식')
    })

    it('변조된 암호문은 에러를 던져야 한다', () => {
      const encrypted = encrypt('original')
      const [iv, tag, data] = encrypted.split(':')
      const tampered = `${iv}:${tag}:${'ff'.repeat(8)}`
      expect(() => decrypt(tampered)).toThrow()
    })

    it('유니코드 문자열도 정상적으로 암복호화해야 한다', () => {
      const text = '한글 테스트 🔑'
      expect(decrypt(encrypt(text))).toBe(text)
    })
  })
})
