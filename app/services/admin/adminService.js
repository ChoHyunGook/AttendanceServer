import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";
import bcrypt from "bcrypt";


export default function AdminService(){

    const { access_jwt_secret,authNum_jwt_secret, COMPANY_SECRET }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company

    return{
        getData(req,res){
            const data= req.body
                User.find({company:data.company})
                    .then(userData=>{
                        Company.find({company:data.company})
                            .then(companyData=>{
                                res.status(200).json({userData:userData,companyData:companyData})
                            })
                    })
                    .catch(err=>{
                        res.status(400).send(err)
                    })

        },
        findData(req,res){
          const data = req.body
            let obj = {}
            obj[data.selectBox] = data.search
          if(data.admin === true){
              Company.find({company:data.company})
                  .then(allData=>{
                      if(data.search.length === 0){
                          let sendData =[]
                          allData[0].responsibility.map(item=>{
                              let adminData = {
                                  id:item.companyId,
                                  name:item.name,
                                  phone:item.phone,
                                  email:item.email,
                                  admin:item.admin ? 'O':'X'
                              }
                              sendData.push(adminData)
                          })
                          res.status(200).send(sendData)
                      }else if(data.selectBox === 'companyId'){
                          let sendData =[]
                          allData[0].responsibility.map(item=>{
                              if(item.companyId === data.search){

                                  let adminData = {
                                      id:item.companyId,
                                      name:item.name,
                                      phone:item.phone,
                                      email:item.email,
                                      admin:item.admin ? 'O':'X'
                                  }
                                  sendData.push(adminData)
                              }
                          })
                          res.status(200).send(sendData)
                      }else if(data.selectBox === 'name'){
                          let sendData =[]
                          allData[0].responsibility.map(item=>{
                              if(item.name === data.search){
                                  let adminData = {
                                      id:item.companyId,
                                      name:item.name,
                                      phone:item.phone,
                                      email:item.email,
                                      admin:item.admin ? 'O':'X'
                                  }
                                  sendData.push(adminData)
                              }
                          })
                          res.status(200).send(sendData)
                      }else if(data.selectBox === 'phone'){
                          let sendData =[]
                          allData[0].responsibility.map(item=>{
                              if(item.phone === data.search){
                                  let adminData = {
                                      id:item.companyId,
                                      name:item.name,
                                      phone:item.phone,
                                      email:item.email,
                                      admin:item.admin ? 'O':'X'
                                  }
                                  sendData.push(adminData)
                              }
                          })
                          res.status(200).send(sendData)
                      }else if(data.selectBox === 'email'){
                          let sendData =[]
                          allData[0].responsibility.map(item=>{
                              if(item.email === data.search){
                                  let adminData = {
                                      id:item.companyId,
                                      name:item.name,
                                      phone:item.phone,
                                      email:item.email,
                                      admin:item.admin ? 'O':'X'
                                  }
                                  sendData.push(adminData)
                              }
                          })
                          res.status(200).send(sendData)
                      }
                  })
                  .catch(err=>{
                      res.status(400).send(err)
                  })
          }else{
              obj['company'] = data.company
              if(data.search.length === 0 || data.selectBox.length === 0){
                      User.find({company:data.company})
                          .then(findData=> {
                              let sendData = []
                              findData.map(e => {
                                  let filter = {
                                      department: e.department,
                                      position: e.position,
                                      id: e.userId,
                                      birth: e.birth,
                                      name: e.name,
                                      phone: e.phone,
                                      joinDate: e.joinDate
                                  }
                                  sendData.push(filter)
                              })
                              res.status(200).send(sendData)
                          })
                          .catch(err=>{
                              res.status(400).send(err)
                          })
              }else{
                  User.find(obj)
                      .then(findData=>{
                          let sendData = []
                          findData.map(e=>{
                              let filter = {
                                  department:e.department,
                                  position:e.position,
                                  id:e.userId,
                                  birth:e.birth,
                                  name:e.name,
                                  phone:e.phone,
                                  joinDate:e.joinDate
                              }
                              sendData.push(filter)
                          })
                          res.status(200).send(sendData)
                      })
                      .catch(err=>{
                          res.status(400).send(err)
                      })
              }
          }
        },
        companyInfoUpdate(req,res){
            const data = req.body
            const params = req.query.contents

            if(params === "companyIdRegister"){
                Company.find({company:data.company})
                    .then(allData=>{
                        let duplicateId = false
                        let duplicatePhone = false
                        let duplicateEmail = false
                        let filterData = []
                        allData[0].responsibility.map(item=>{
                            if(item.companyId === data.companyId){
                                duplicateId = true
                            }
                            if(item.phone === data.phone){
                                duplicatePhone = true
                            }
                            if(item.email === data.email){
                                duplicateEmail = true
                            }
                            filterData.push(item)
                        })
                        if(duplicateId === true){
                            res.status(400).send('사용중인 기업아이디가 있습니다. 다시 한번 확인해주세요.')
                        }else if(duplicatePhone === true){
                            res.status(400).send('사용중인 담당자 전화번호 입니다. 다시 한번 확인해주세요.')
                        }else if(duplicateEmail === true){
                            res.status(400).send('사용중인 담당자 이메일 입니다. 다시 한번 확인해주세요.')
                        }else{
                            const bcryptPwData = bcrypt.hashSync(data.password, 10)
                            let setData = {
                                responsibility:[...filterData,{companyId:data.companyId,email:data.email,password: bcryptPwData,
                                    name:data.name,phone:data.phone,admin:data.admin}]
                            }

                            Company.findOneAndUpdate({company:data.company},{$set:setData})
                                .then(suc=>{
                                    res.status(200).send('기업 아이디 생성 완료')
                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })
                        }
                    })
            }

            if(params === 'updateInfo'){
                Company.find({company:data.company})
                    .then(allData=>{
                        let fd = [data]
                        let basicData = []
                        let filterData = []
                        let duplicatePhone = false
                        let duplicateEmail = false

                        allData[0].responsibility.map(item=>{
                            if(item.companyId === data.companyId){
                                filterData.push(item)
                            }
                            if(item.phone === data.phone){
                                duplicatePhone = true
                            }
                            if(item.email === data.email){
                                duplicateEmail = true
                            }
                            basicData.push(item)
                        })
                        if(duplicatePhone === true){
                            res.status(400).send('사용중인 담당자 전화번호 입니다. 다시 한번 확인해주세요.')
                        }else if(duplicateEmail === true){
                            res.status(400).send('사용중인 담당자 이메일 입니다. 다시 한번 확인해주세요.')
                        }else{
                            let setData = []

                            const bcryptPwData = bcrypt.hashSync(data.password, 10)

                            fd.map(e=>{
                                let pushData = {
                                    companyId:e.companyId,
                                    email:e.email === 'plane' ? filterData[0].email:e.email,
                                    password:e.password === 'plane' ? filterData[0].password:bcryptPwData,
                                    name:e.name === 'plane' ? filterData[0].name:e.name,
                                    phone:e.phone === 'plane' ? filterData[0].phone:e.phone,
                                    admin:e.admin === 'plane' ? filterData[0].admin:e.admin,
                                }
                                setData.push(pushData)
                            })
                            const updateData = basicData.filter(e=>e.companyId != data.companyId)

                            let finalData = {
                                responsibility:[...updateData,...setData]
                            }

                            Company.findOneAndUpdate({company:data.company},{$set:finalData})
                                .then(suc=>{
                                    res.status(200).send('기업 단일 정보 수정 완료.')
                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })

                        }

                    })
                    .catch(err=>{
                        res.status(400).send(err)
                    })
            }

            if(params === 'delAdmin'){
                Company.find({company:data.company})
                    .then(allData=>{
                        let filterData = []
                        allData[0].responsibility.map(item=>{
                            if(item.companyId === data.companyId){
                                filterData.push(item)
                            }
                        })
                        console.log(filterData)
                    })
                    .catch(err=>{
                        res.status(400).send(err)
                    })
            }

        },


    }
}