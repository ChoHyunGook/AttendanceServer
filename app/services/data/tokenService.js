import jwt from "jsonwebtoken";
import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";


export default function TokenService(){

    const { access_jwt_secret, authNum_jwt_secret }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company

    return{
        authNumCheck(req,res){
            const data =req.body
            const tokenData = req.cookies.authNumToken
            const verify = jwt.verify(tokenData, authNum_jwt_secret)

            if(verify.authNum !== data.authNum){
                res.status(400).send('인증번호가 불일치 합니다.')
            }else{
                res.status(200).send('인증번호가 일치 합니다.')
            }

        },
        checkToken(req,res){
            const data =req.body
            const tokenData = req.cookies
            if(data.check === 'addInfo'){
                if(data.name in tokenData){
                    res.clearCookie('accessToken')
                    res.status(200).send(data.name in tokenData)
                }else{
                    res.status(400).send('Not logged in')
                }
            }
            if(data.check === 'loginCheck'){
                const token = tokenData.accessToken
                const verify = jwt.verify(token,access_jwt_secret)
                jwt.verify(token,access_jwt_secret,(err)=>{
                    if(err){
                        res.status(400).send(err)
                    }else{
                        User.findOne({userId:verify.userId},function (err,user){
                            if(err) throw(err)
                            res.status(200).send(user)
                        })
                    }
                })
            }


            // const verify = jwt.verify(tokenData, authNum_jwt_secret)
            //
            // if(verify.authNum !== data.authNum){
            //     res.status(400).send('인증번호가 불일치 합니다.')
            // }else{
            //     res.status(200).send('인증번호가 일치 합니다.')
            // }

        },
    }
}