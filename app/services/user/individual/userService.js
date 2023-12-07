import db from '../../../DataBase/index.js'
import applyDotenv from "../../../Lambdas/applyDotenv.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import moment from "moment-timezone";
dotenv.config()

export default function UserService(){

    const { access_jwt_secret,authNum_jwt_secret, COMPANY_SECRET }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company


    return{
        findService(req,res){
            try{
                const data = req.body
                const tokenData = req.cookies.authNumToken
                const verify = jwt.verify(tokenData, authNum_jwt_secret)
                if(data.authNum !== verify.authNum){
                    res.status(400).send('인증번호가 불일치 합니다.')
                }else{
                    if(data.changePw === true){
                        if(data.userId === undefined){
                            User.findOne({phone:data.phone})
                                .then(findData=>{
                                    const userIdData = {userId:findData.userId}
                                    const bcryptPwData = bcrypt.hashSync(data.password, 10)
                                    const insertPwData = {password: bcryptPwData}
                                    User.findOneAndUpdate(userIdData,{$set:insertPwData},{upsert:true})
                                        .then(user=>{
                                            res.status(200).clearCookie('authNumToken', '').send('비밀번호 변경완료')
                                        })
                                })
                        }else{
                            const userIdData = {userId:data.userId}
                            const bcryptPwData = bcrypt.hashSync(data.password, 10)
                            const insertPwData = {password: bcryptPwData}
                            User.findOneAndUpdate(userIdData,{$set:insertPwData},{upsert:true})
                                .then(user=>{
                                    res.status(200).clearCookie('authNumToken', '').send('비밀번호 변경완료')
                                })
                        }
                    }else if(data.name !== undefined){
                        User.findOne({name:data.name,phone:data.phone})
                            .then(findData=>{
                                res.status(200).send(findData)
                            })
                    }else{
                        if(data.userId === undefined){
                            User.findOne({phone:data.phone})
                                .then(findData=>{
                                    if(!findData){
                                        res.status(400).send('가입 되어있는 전화번호가 없습니다.')
                                    }else{
                                        let sendData = {
                                            data:findData,
                                            authNum:data.authNum
                                        }
                                        res.status(200).json({data:sendData,msg:'인증완료'})
                                    }
                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })
                        }else{
                            User.findOne({userId:data.userId})
                                .then(findData=>{
                                    if(!findData){
                                        res.status(400).send('가입 되어있는 아이디가 없습니다.')
                                    }else{
                                        let sendData = {
                                            data:findData,
                                            authNum:data.authNum
                                        }
                                        res.status(200).json({data:sendData,msg:'인증완료'})
                                    }

                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })
                        }
                    }
                }
            }catch (e) {
                if(e.name === 'TokenExpiredError'){
                    res.status(500).send('인증시간이 만료되었습니다.')
                }
            }
        },
        register(req,res){
            const data = req.body
            User.findOne({userId: req.body.userId}, function (err, user) {
                if (err) throw err
                if (!user) {
                    User.findOne({phone: req.body.phone}, function (err, user) {
                        if (err) throw err
                        if (!user) {
                            let saveData = {
                                company: data.company,
                                department: data.department,
                                position: data.position,
                                name: data.name,
                                birth: data.birth,
                                userId: data.userId,
                                password: data.password,
                                phone: data.phone,
                                workTime: null,
                                joinDate: null,
                                lunchTime: null
                            }

                            new User(saveData).save((err) => {
                                if (err) {
                                    res.status(500).send(err)
                                } else {
                                    res.status(200)
                                        .json({message: '회원가입 성공.', data: User})
                                }
                            })
                        } else {
                            return res.status(500).send('이미 사용중인 전화번호입니다. 다시 한번 확인해주세요!')
                        }
                    })
                } else {
                    return res.status(500).send('이미 사용중인 이메일 주소입니다 다시 한번 확인해 주세요!')
                }
            })



        },


        login(req,res){
          User.findOne({
              userId:req.body.userId
          },function (err,user) {
              if(err) throw err
              if(!user){
                  res.status(400).send('해당 ID로 가입된 정보가 존재하지 않습니다.')
              }else {
                  user.comparePassword(req.body.password,function (_err, isMatch){
                      if(!isMatch){
                          res.status(400).send('비밀번호를 다시 한번 확인해주세요.')
                      }else{
                          try{
                              let time = moment().tz('Asia/Seoul')
                              let day = time.format('YYYY-MM-DD kk:mm:ss')
                              let ex = moment(day).add(1,'hours').format('YYYY-MM-DD kk:mm:ss')

                              const accessToken = jwt.sign({
                                  company: user.company,
                                  department: user.department,
                                  position: user.position,
                                  name: user.name,
                                  birth: user.birth,
                                  userId: user.userId,
                                  phone: user.phone,
                                  workTime: user.workTime,
                                  joinDate: user.joinDate,
                                  lunchTime: user.lunchTime,
                                  expiresDate:ex
                              },access_jwt_secret,{expiresIn:'1h'})

                              res.cookie('accessToken',accessToken,{
                                  secure: false,
                                  httpOnly: true
                              })
                              let sendData = {
                                  company: user.company,
                                  department: user.department,
                                  position: user.position,
                                  name: user.name,
                                  birth: user.birth,
                                  userId: user.userId,
                                  phone: user.phone,
                                  workTime: user.workTime,
                                  joinDate: user.joinDate,
                                  lunchTime: user.lunchTime,
                                  expiresDate:ex
                              }

                              res.status(200).send(sendData)

                          }catch (err){
                              res.status(400).send(err)
                          }
                      }
                  })
              }
          })

        },

        logout(req,res){
            try {
                res.clearCookie('accessToken')
                res.clearCookie('authLoginToken')
                res.status(200).json({message: "logout success"})
            } catch (err) {
                res.status(400).json(err)
            }
        },

        addInfo(req,res){
            const data = req.body
            User.findOneAndUpdate({company:data.company, userId:data.userId}, {$set:data})
                .then(datas=>{
                    User.findOne({company:data.company,userId:data.userId})
                        .then(updateData=>{
                            res.status(200).send(updateData)
                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                })
                .catch(err=>{
                    res.status(400).send(err)
                })
        },

        addLoginTime(req,res){
            const data = req.body
            let time = moment().tz('Asia/Seoul')
            let day = time.format('YYYY-MM-DD kk:mm:ss')
            let ex = moment(day).add(1,'hours').format('YYYY-MM-DD kk:mm:ss')

            let companyData = []
            let responsibilityData = []

            Company.find({company:req.body.company})
                .then(all=>{
                    all.map(e=>{
                            e.responsibility.map(item=>{
                                if(data.companyId === item.companyId){
                                    companyData.push(e)
                                    responsibilityData.push(item)
                                }
                            })
                    })

                    const companyInfo = companyData[0]
                    const resData = responsibilityData[0]

                    if(resData.admin === true){
                        //어드민
                        const companyToken = jwt.sign({
                            company:companyInfo.company,
                            loginId:data.companyId,
                            manager:false,
                            admin:true,
                            approval: companyInfo.approval,
                            expireTime:ex
                        },COMPANY_SECRET,{expiresIn:'1h'})

                        res.cookie('companyInfoToken',companyToken,{
                            secure:true,
                            httpOnly:true
                        })
                        let sendData = {
                            company:companyInfo.company,
                            organizations:companyInfo.organizations,
                            macAddress:companyInfo.macAddress,
                            responsibility:companyInfo.responsibility,
                            loginId:data.companyId,
                            manager:false,
                            admin:true,
                            approval: companyInfo.approval,
                            expireTime:ex
                        }
                        res.status(200).send(sendData)


                    }else{
                        if(resData.manager === true){
                            //매니저

                        }else{
                            User.findOne({userId:data.userId,company:data.company,name:data.name,phone:data.phone})
                                .then(user=>{
                                    const companyToken = jwt.sign({
                                        company:companyInfo.company,
                                        loginId:data.companyId,
                                        manager:false,
                                        admin:false,
                                        approval: companyInfo.approval,
                                        expireTime:ex

                                    },COMPANY_SECRET,{expiresIn:'1h'})


                                    const accessToken = jwt.sign({
                                        company: user.company,
                                        department: user.department,
                                        position: user.position,
                                        name: user.name,
                                        birth: user.birth,
                                        userId: user.userId,
                                        phone: user.phone,
                                        workTime: user.workTime,
                                        joinDate: user.joinDate,
                                        lunchTime: user.lunchTime,
                                        expiresDate:ex
                                    },access_jwt_secret,{expiresIn:'1h'})

                                    res.cookie('companyInfoToken',companyToken,{
                                        secure:false,
                                        httpOnly:true
                                    })

                                    res.cookie('accessToken',accessToken,{
                                        secure: false,
                                        httpOnly: true
                                    })

                                    let sendCompanyData = {
                                        company:companyInfo.company,
                                        organizations:companyInfo.organizations,
                                        responsibility:companyInfo.responsibility,
                                        macAddress:companyInfo.macAddress,
                                        loginId:data.companyId,
                                        manager:false,
                                        admin:false,
                                        approval: companyInfo.approval,
                                        expireTime:ex
                                    }
                                    let sendUserData = {
                                        company: user.company,
                                        department: user.department,
                                        position: user.position,
                                        name: user.name,
                                        birth: user.birth,
                                        userId: user.userId,
                                        phone: user.phone,
                                        workTime: user.workTime,
                                        joinDate: user.joinDate,
                                        lunchTime: user.lunchTime,
                                        expiresDate:ex
                                    }

                                    res.status(200).json({companyData:sendCompanyData,userData:sendUserData})

                                })
                        }
                    }

                })
                .catch(err=>{
                    res.status(400).send(err)
                })



        },


    }
}