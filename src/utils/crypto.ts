import CryptoJS from 'crypto-js';

// 与后端 wafsec 模块约定的通讯密钥（同 Vue2 版本，不得变更）
const AES_KEY = '7E@u*has$d*@s5YX';

function generateRandomIV() {
  return CryptoJS.lib.WordArray.random(16);
}

/**
 * 解密数据：密文为 Base64(IV + CipherText)，AES-CBC + Pkcs7
 */
export function AesDecrypt(encryptedText: string): string {
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);

  const encryptedDataWithIV = CryptoJS.enc.Base64.parse(encryptedText);
  const iv = CryptoJS.lib.WordArray.create(encryptedDataWithIV.words.slice(0, 4)); // IV 为前 16 字节
  const encryptedData = CryptoJS.lib.WordArray.create(encryptedDataWithIV.words.slice(4));

  const decrypted = CryptoJS.AES.decrypt(
    // @ts-expect-error crypto-js 允许以 { ciphertext } 形式传入 CipherParams
    { ciphertext: encryptedData },
    key,
    {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    },
  );

  return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * 加密数据：随机 IV 前置拼接密文后整体 Base64
 */
export function AesEncrypt(plainText: string): string {
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const iv = generateRandomIV();

  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const encryptedDataWithIV = iv.concat(encrypted.ciphertext);
  return CryptoJS.enc.Base64.stringify(encryptedDataWithIV);
}
