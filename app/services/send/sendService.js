import db from '../../DataBase/index.js'
import jwt from 'jsonwebtoken'
import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import CryptoJS from 'crypto-js';
import axios from "axios";
import bcrypt from "bcrypt";


export default function SendService(){

    const {
        SMS_service_id,SMS_secret_key,SMS_access_key,SMS_PHONE,authNum_jwt_secret
    } = applyDotenv(dotenv)

    const User = db.User

    const date = Date.now().toString()

    const serviceId = SMS_service_id;
    const secretKey = SMS_secret_key;
    const accessKey = SMS_access_key;
    const smsPhone = SMS_PHONE;

    const method = "POST";
    const space = " ";
    const newLine = "\n";
    const url = `https://sens.apigw.ntruss.com/sms/v2/services/${serviceId}/messages`;
    const url2 = `/sms/v2/services/${serviceId}/messages`;

    const hmac = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, secretKey);
    hmac.update(method);
    hmac.update(space);
    hmac.update(url2);
    hmac.update(newLine);
    hmac.update(date);
    hmac.update(newLine);
    hmac.update(accessKey);
    const hash = hmac.finalize();
    const signature = hash.toString(CryptoJS.enc.Base64);

    let authNum = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");


    return{
        RegisterSMS(req,res){
            const data = req.body
            User.findOne({phone: data.phone}, function (err, user) {
                if (err) throw err
                if (!user) {
                    const user_phone = req.body.phone
                    const phoneNumber = user_phone.split("-").join("");
                    const phoneSubject = req.body.phoneSubject

                    const authNumToken = jwt.sign({
                        authNum: authNum,
                        phone: req.body.phone,
                    }, authNum_jwt_secret, {expiresIn: '3m'})


                    res.cookie("authNumToken", authNumToken, {
                        secure: false,
                        httpOnly: true
                    })

                    axios({
                        method: method,
                        json: true,
                        url: url,
                        headers: {
                            "Contenc-type": "application/json; charset=utf-8",
                            "x-ncp-iam-access-key": accessKey,
                            "x-ncp-apigw-timestamp": date
                            ,
                            "x-ncp-apigw-signature-v2": signature,
                        },
                        data: {
                            type: "SMS",
                            countryCode: "82",
                            from: smsPhone,
                            content: `[Attendance Magagement]\n [${phoneSubject} 서비스]\n 인증번호는 [${authNum}] 입니다.`,
                            messages: [{to: `${phoneNumber}`}],
                        },
                    });
                    return res.status(200).send('인증번호가 전송되었습니다. 인증번호 유효시간은 3분입니다.')
                } else {
                    res.status(500).send('이미 등록되어있는 핸드폰번호입니다. 이미 가입하셨다면 아이디/비밀번호찾기를 이용해주세요.')
                }
            })

        },
        SMSService(req,res){
            const user_phone = req.body.phone
            const phoneNumber = user_phone.split("-").join("");
            const phoneSubject = req.body.phoneSubject

            const authNumToken = jwt.sign({
                authNum: authNum,
                phone: req.body.phone,
            }, authNum_jwt_secret, {expiresIn: '3m'})


            res.cookie("authNumToken", authNumToken, {
                secure: false,
                httpOnly: true
            })

            axios({
                method: method,
                json: true,
                url: url,
                headers: {
                    "Contenc-type": "application/json; charset=utf-8",
                    "x-ncp-iam-access-key": accessKey,
                    "x-ncp-apigw-timestamp": date
                    ,
                    "x-ncp-apigw-signature-v2": signature,
                },
                data: {
                    type: "SMS",
                    countryCode: "82",
                    from: smsPhone,
                    content: `[WeToGo]\n [${phoneSubject} 서비스]\n 인증번호는 [${authNum}] 입니다.`,
                    messages: [{to: `${phoneNumber}`}],
                },
            });
            return res.status(200).send('인증번호가 전송되었습니다. 인증번호 유효시간은 3분입니다.')
        },
        EmailService(req,res){

        }
    }
}