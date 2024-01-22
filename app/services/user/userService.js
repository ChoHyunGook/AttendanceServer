import db from '../../DataBase/index.js'
import applyDotenv from "../../Lambdas/applyDotenv.js";
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
        find(req,res){
            const data= req.body
            const params = req.query.select
            if(params === 'Id'){
                User.findOne({name:data.name,phone:data.phone})
                    .then(findData=>{
                        if(!findData){
                            res.status(400).send('가입 되어있는 정보가 없습니다. 기업 관리자에게 문의해 주세요.')
                        }else{
                            let sendData = {
                                company:findData.company,
                                userId:findData.userId,
                                name:findData.name,
                                phone:findData.phone
                            }
                            res.status(200).send(sendData)
                        }
                    })
            }
            if(params === 'Pw'){
                User.findOne({userId:data.userId,phone:data.phone})
                    .then(findData=>{
                        if(!findData){
                            res.status(400).send('가입 되어있는 정보가 없습니다. 기업 관리자에게 문의해 주세요.')
                        }else{
                            let sendData = {
                                company:findData.company,
                                userId:findData.userId,
                                name:findData.name,
                                phone:findData.phone
                            }
                            res.status(200).send(sendData)
                        }
                    })
            }
            if(params === 'Change'){
                User.findOne({userId:data.userId,phone:data.phone,name:data.name,company:data.company})
                    .then(findData=>{
                        if(!findData){
                            res.status(400).send('가입 되어있는 정보가 없습니다. 기업 관리자에게 문의해 주세요.')
                        }else{
                            const bcryptPwData = bcrypt.hashSync(data.pw, 10)
                            const insertPwData = {password: bcryptPwData}
                            User.findOneAndUpdate({userId:data.userId,name:data.name,company:data.company,phone:data.phone}
                            , {$set:insertPwData},{upsert:true})
                                .then(suc=>{
                                    let sendData = {
                                        company:data.company,
                                        userId:data.userId,
                                        password:data.pw,
                                        name:data.name,
                                        phone:data.phone
                                    }
                                    res.status(200).send(sendData)
                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })
                        }
                    })
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
                            new User(data).save((err) => {
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
                  res.status(400).send('해당 ID로 가입된 정보가 존재하지 않습니다. 기업 관리자에게 다시 한번 확인 부탁드립니다.')
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
                                  department: user.affiliation.department,
                                  position: user.affiliation.position,
                                  name: user.name,
                                  userId: user.userId,
                                  phone: user.phone,
                                  expiresDate:ex
                              },access_jwt_secret,{expiresIn:'1h'})

                              if(user.form.admin === true){

                                  Company.findOne({company:user.company})
                                      .then(findData=>{
                                          res.cookie('accessToken',accessToken,{
                                              secure: false,
                                              httpOnly: true
                                          })
                                          let sendData = {
                                              company: user.company,
                                              affiliation:user.affiliation,
                                              info:{name:user.name,userId: user.userId,
                                                  phone: user.phone},
                                              break:user.break,
                                              form:user.form,
                                              etc:user.etc,
                                              expiresDate:ex
                                          }

                                          res.status(200).json({userData:sendData,companyData:findData})
                                      })
                              }
                              if(user.form.manager === true){
                                  Company.find({})
                                      .then(allData=>{
                                          res.cookie('accessToken',accessToken,{
                                              secure: false,
                                              httpOnly: true
                                          })
                                          let sendData = {
                                              company: user.company,
                                              affiliation:user.affiliation,
                                              info:{name:user.name,userId: user.userId,
                                                  phone: user.phone},
                                              break:user.break,
                                              form:user.form,
                                              etc:user.etc,
                                              expiresDate:ex
                                          }

                                          res.status(200).json({userData:sendData,companyData:allData})
                                      })
                              }
                              if(user.form.normal === true){

                                  Company.findOne({company:user.company})
                                      .then(allData=>{
                                          let companyData = []

                                          allData.organizations.map(e=>{
                                              if(user.affiliation.department === e.department){
                                                  companyData.push(e)
                                              }
                                          })
                                          res.cookie('accessToken',accessToken,{
                                              secure: false,
                                              httpOnly: true
                                          })
                                          let sendData = {
                                              company: user.company,
                                              affiliation:user.affiliation,
                                              info:{name:user.name,userId: user.userId,
                                                  phone: user.phone},
                                              break:user.break,
                                              form:user.form,
                                              etc:user.etc,
                                              expiresDate:ex
                                          }

                                          res.status(200).json({userData:sendData,companyData:companyData[0]})
                                      })
                              }

                          }catch (err){
                              res.status(400).send(err)
                          }
                      }
                  })
              }
          })

        },

        update(req,res){
            const data = req.body
            const params = req.query.plane

            User.findOne({userId:data.userId})
                .then(findData=>{
                    User.find({phone:data.phone})
                        .then(dupData=>{
                            const duplicateData = dupData[0]

                            if(duplicateData.userId === data.userId || dupData.length === 0){
                                let saveData
                                if(params === 'true'){
                                    saveData = {...data,password:findData.password
                                    }
                                }else{
                                    const pwData = data.password
                                    const bcryptPwData = bcrypt.hashSync(pwData, 10)
                                    saveData = {...data,password:bcryptPwData
                                    }
                                }

                                User.findOneAndUpdate({userId:data.userId},{$set:saveData})
                                    .then(suc=>{
                                        const tokenData = req.cookies.accessToken
                                        const verify = jwt.verify(tokenData, access_jwt_secret)
                                        if(verify.userId === data.userId){
                                            User.findOne({userId:data.userId})
                                                .then(user=>{
                                                    const accessToken = jwt.sign({
                                                        company: user.company,
                                                        department: user.affiliation.department,
                                                        position: user.affiliation.position,
                                                        name: user.name,
                                                        userId: user.userId,
                                                        phone: user.phone,
                                                        expiresDate:verify.expiresDate
                                                    },access_jwt_secret,{expiresIn:'1h'})

                                                    res.cookie('accessToken',accessToken,{
                                                        secure: false,
                                                        httpOnly: true
                                                    })
                                                    let sendData = {
                                                        company: user.company,
                                                        affiliation:user.affiliation,
                                                        info:{name:user.name,userId: user.userId,
                                                            phone: user.phone},
                                                        break:user.break,
                                                        form:user.form,
                                                        etc:user.etc,
                                                        expiresDate:verify.expiresDate
                                                    }
                                                    res.status(200).json({msg:`${user.name}의 정보가 변경되었습니다.`,data:sendData})
                                                })
                                        }else{
                                            res.status(200).json({msg:`${data.name}의 정보가 변경되었습니다.`,data:'None'})
                                        }
                                    })
                            }else{
                                res.status(400).send('이미 사용중인 전화번호 입니다.')
                            }
                        })
                })
                .catch(err=>{
                    res.status(400).send(err)
                })



        },
        delUser(req,res){
            const data = req.body
            let idMap = data.map(e => e.userId)
            let nameMap = data.map(e=>e.name)
            let phoneMap = data.map(e=>e.phone)
            User.deleteMany({userId: idMap, name: nameMap, phone: phoneMap}, function (err) {
                if (err) {
                    res.status(400).send(err)
                } else {
                    res.status(200).send(`${nameMap} 의 계정이 삭제 되었습니다. 감사합니다.`)
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

            User.findOne({company:data.company,userId:data.userId,name:data.name,phone:data.phone})
                .then(user=>{
                    const accessToken = jwt.sign({
                        company: user.company,
                        department: user.affiliation.department,
                        position: user.affiliation.position,
                        name: user.name,
                        userId: user.userId,
                        phone: user.phone,
                        expiresDate:ex
                    },access_jwt_secret,{expiresIn:'1h'})

                    res.cookie('accessToken',accessToken,{
                        secure: false,
                        httpOnly: true
                    })
                    let sendData = {
                        company: user.company,
                        affiliation:user.affiliation,
                        info:{name:user.name,userId: user.userId,
                            phone: user.phone},
                        break:user.break,
                        form:user.form,
                        etc:user.etc,
                        expiresDate:ex
                    }

                    res.status(200).send(sendData)
                })

        },


    }
}