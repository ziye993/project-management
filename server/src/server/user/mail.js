import nodemailer from 'nodemailer';

const {createTransport} = nodemailer;
import crypto from 'crypto';

// 生成指定位数的数字验证码（安全版本）
function generateSecureCode(digits = 6) {
  const min = Math.pow(10, digits - 1); // 最小值（如6位：100000）
  const max = Math.pow(10, digits) - 1;  // 最大值（如6位：999999）

  // 生成安全随机整数
  return crypto.randomInt(min, max + 1).toString();
}

// 邮件配置
const mailConfig = {
  service: 'QQ', // 邮箱服务提供商，如 QQ、Gmail、163 等
  auth: {
    user: '2761042436@qq.com', // 你的邮箱地址
    pass: 'ctjahnswffnydeca', // 邮箱授权码，不是登录密码
  },
};

// 创建 SMTP 传输器
const transporter = createTransport(mailConfig);

// 
let emailCodes = [];

setInterval(() => {
  const now = Date.now();
  emailCodes = emailCodes.filter(_ => _.endTime > now)
}, 1000 * 60 * 5)

/**
 * 发送验证码邮件
 * @param {string} to - 接收邮件的地址
 * @returns {Promise<Object>} - 发送结果
 */
async function sendVerificationCode(to) {
  if (emailCodes > 500) return {success: false, message: ''}
  const [userEmail] = emailCodes.filter(_ => _.email === to)
  if (userEmail) {
    const now = Date.now();
    if (userEmail.endTime - now > (4 * 60 * 1000)) {
      return {success: false, message: '不可以重复发送，请检查邮箱，或稍后再试。'};
    }
  }
  const secureCode = generateSecureCode();
  try {
    // 邮件内容
    const mailOptions = {
      from: mailConfig.auth.user, // 发件人邮箱
      to, // 收件人邮箱
      subject: '【系统】验证码', // 邮件主题
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h3 style="color: #333;">您的验证码是：</h3>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center; color: #333;">
            ${secureCode}
          </div>
          <p style="color: #666; margin-top: 20px;">该验证码 5 分钟内有效，请及时输入。</p>
          <p style="color: #999; margin-top: 10px;">如果您没有请求验证码，请忽略此邮件。</p>
        </div>
      `, // 邮件内容（HTML 格式）
    };

    // 发送邮件
    await transporter.sendMail(mailOptions);
    emailCodes.push({email: to, code: secureCode, endTime: Date.now() + (1000 * 60 * 5)})
    return {success: true, message: '验证码已发送至您的邮箱'};
  } catch (error) {
    console.error('邮件发送失败:', error);
    return {success: false, message: '邮件发送失败，请稍后重试'};
  }

}

//验证code
function veriCodeToEmail(email, code) {
  const now = Date.now();
  const resArr = emailCodes.filter(_ => _.email === email && _.code === code);
  if (resArr.length) {
    if (now > resArr[0].endTime) return {code: 1, msg: 'Verification code expired'}; //失效
    else {
      resArr[0].endTime = 0;
      return {code: 0, msg: ''}
    } //成功
  } else return {code: 2, msg: 'Invalid verification code'} //错误
}


export {sendVerificationCode, veriCodeToEmail};
