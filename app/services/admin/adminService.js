import applyDotenv from "../../Lambdas/applyDotenv.js";
import dotenv from "dotenv";
import db from "../../DataBase/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


export default function AdminService(){

    const { access_jwt_secret,authNum_jwt_secret, COMPANY_SECRET }=applyDotenv(dotenv)

    const User = db.User
    const Company = db.Company

    return{
        getData(req,res){
            const company = req.query.company
            Company.find({company:company})
                .then(companyData=>{
                    User.find({company:company})
                        .then(userData=>{

                            res.status(200).json({companyData:companyData,userData:userData})
                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                })
                .catch(err=>{
                    res.status(400).send(err)
                })
        },

        adminService(req,res){
            const data = req.body
            const params = req.query.contents
            const types = req.query.type
            const reResponse = req.query.reResponse

            if(params === 'organizations'){
                if(types === 'create'){
                    Company.findOne({company:data.company})
                        .then(allData=>{
                            let duplicateDepartment = false
                            let filterData = []
                            allData.organizations.map(e=>{
                                if(e.department === data.organizations.department){
                                    duplicateDepartment = true
                                }else{
                                    filterData.push(e)
                                }
                            })

                            if(duplicateDepartment === true){
                                res.status(400).send('이미 등록 되어있는 부서입니다. 수정은 부서수정 서비스를 이용해 주시기 바랍니다.')
                            }else{
                                let setData = {organizations:[data.organizations,...filterData]}
                                Company.findOneAndUpdate({company:data.company},{$set:setData})
                                    .then(suc=>{
                                        Company.findOne({company:data.company})
                                            .then(findData=>{
                                                res.status(200).json({msg:`신규 부서 ${data.organizations.department} 가(이) 생성 되었습니다.`
                                                    ,data:findData})
                                            })
                                            .catch(err=>{
                                                res.status(400).send(err)
                                            })
                                    })
                                    .catch(err=>{
                                        res.status(400).send(err)
                                    })
                            }
                        })
                }
                if(types === 'checkUpdate'){
                    Company.findOne({company:data.company})
                        .then(allData=>{
                            User.find({company:data.company})
                                .then(userAllData=>{
                                    let filterData = []
                                    let userFilterData = []

                                    const checkData = allData.organizations.filter((item)=>data.basicData.some((e)=> e.department === item.department))
                                    let basicData = allData.organizations.filter(x=>!checkData.includes(x))


                                    checkData.map(e=>{
                                        data.changeData.map(item=>{
                                            if(e.department === item.department){
                                                if(filterData.length > 0){
                                                    if(filterData.some(x=>x.department === item.department) === true ){
                                                        const filterNum = filterData.findIndex(obj=>obj.department == item.department)
                                                        let changeList = filterData[filterNum]
                                                        const num = filterData[filterNum].position.findIndex(obj=>obj.name == item.basicPosition)
                                                        changeList.position[num].name = item.position
                                                        changeList.position[num].mac = item.mac
                                                        filterData[filterNum] = changeList
                                                    }else{
                                                        const num = e.position.findIndex(obj=>obj.name == item.basicPosition)
                                                        let changeList = e.position
                                                        changeList[num].name = item.position
                                                        changeList[num].mac = item.mac
                                                        filterData.push({department:e.department,position:changeList})
                                                    }
                                                }else{
                                                    const num = e.position.findIndex(obj=>obj.name == item.basicPosition)
                                                    let changeList = e.position
                                                    changeList[num].name = item.position
                                                    changeList[num].mac = item.mac
                                                    filterData.push({department:e.department,position:changeList})
                                                }

                                            }
                                        })
                                    })


                                    userAllData.map(item=>{
                                        data.changeData.map(e=>{
                                            if(item.affiliation.department === e.department){
                                                if(item.affiliation.position === e.basicPosition){
                                                    let pushData = {
                                                        company:item.company,
                                                        affiliation:{
                                                            department:item.affiliation.department,
                                                            position:e.position,
                                                            macAddress:e.mac,
                                                            _id:item.affiliation._id
                                                        },
                                                        name:item.name,
                                                        userId:item.userId,
                                                        password:item.password,
                                                        phone:item.phone,
                                                        break:item.break,
                                                        form:item.form,
                                                        etc:item.etc
                                                    }
                                                    userFilterData.push(pushData)
                                                }
                                            }
                                        })
                                    })

                                    let duplicatePosition = false
                                    let duplicateData = []

                                    filterData.map(e=>{
                                        function checkDuplicate(arr, keys) {
                                            const seen = new Set();
                                            for (const item of arr) {
                                                const key = keys.map(key => item[key]).join('-'); // 특정 키들을 조합하여 하나의 문자열로 만듦
                                                if (seen.has(key)) {
                                                    // 중복된 데이터가 있음
                                                    duplicateData.push(e.department)
                                                    return true;
                                                }
                                                seen.add(key);
                                            }
                                            // 중복된 데이터가 없음
                                            return false;
                                        }

                                        const keysToCheck = ["name"]; // 체크할 키들
                                        const isDuplicate = checkDuplicate(e.position, keysToCheck);
                                        if(isDuplicate === true){
                                            duplicatePosition = true
                                        }

                                    })


                                    let setData = {organizations:[...filterData,...basicData]}

                                    if(duplicatePosition === true){
                                        res.status(400).send(`${duplicateData} 부서에 중복되는 포지션 명이 있습니다.`)
                                    }else{
                                        Company.findOneAndUpdate({company:data.company},{$set:setData})
                                            .then(suc=>{
                                                User.bulkWrite(userFilterData.map((item)=>({
                                                        updateOne:{
                                                            filter:{userId:item.userId},
                                                            update:{$set:item},
                                                            upsert:true
                                                        }
                                                    }))
                                                )
                                                    .then(suc2=>{
                                                        let sendUser = false
                                                        userFilterData.map(item => {
                                                            if (item.userId === data.loginData.info.userId) {
                                                                sendUser = true
                                                            }
                                                        })
                                                        Company.findOne({company:data.company})
                                                            .then(findData=>{
                                                                if(sendUser === true){
                                                                    User.findOne({userId:data.loginData.info.userId,phone:data.loginData.info.phone})
                                                                        .then(user => {
                                                                            let sendUserData = {
                                                                                company: user.company,
                                                                                affiliation: user.affiliation,
                                                                                info: {
                                                                                    name: user.name,
                                                                                    userId: user.userId,
                                                                                    phone: user.phone
                                                                                },
                                                                                break: user.break,
                                                                                form: user.form,
                                                                                etc: user.etc,
                                                                                expiresDate: data.loginData.expiresDate
                                                                            }

                                                                            res.status(200).json({
                                                                                msg: `부서 ${checkData.map(e=>e.department)} 의 정보가 수정 되었습니다.`
                                                                                ,
                                                                                companyData: findData,
                                                                                userData: sendUserData
                                                                            })
                                                                        })
                                                                }else{
                                                                    res.status(200).json({msg:`부서 ${checkData.map(e=>e.department)} 의 정보가 수정 되었습니다.`
                                                                                                       ,companyData:findData,userData:'None'})
                                                                }
                                                            })

                                                    })
                                            })
                                    }



                                })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })
                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                }

                if(types === 'changeDepartment'){
                    Company.findOne({company:data.company})
                        .then(allData=>{
                            User.find({company:data.company})
                                .then(userAllData=>{
                                    let basicData = []
                                    let userIds =[]
                                    let userChangeData = []
                                    let changeData = []
                                    allData.organizations.map(e=>{
                                        if(e.department !== data.basic){
                                            basicData.push(e)
                                        }else{
                                            let pushData = {
                                                department:data.department,
                                                position:e.position,
                                                _id:e._id
                                            }
                                            changeData.push(pushData)
                                        }
                                    })
                                    userAllData.map(e=>{
                                        if(e.affiliation.department === data.basic){
                                            let pushData = {
                                                company:e.company,
                                                affiliation:{
                                                    department:data.department,
                                                    position:e.affiliation.position,
                                                    macAddress:e.affiliation.macAddress,
                                                    _id:e.affiliation._id
                                                },
                                                name:e.name,
                                                userId:e.userId,
                                                password:e.password,
                                                phone:e.phone,
                                                break:e.break,
                                                form:e.form,
                                                etc:e.etc
                                            }
                                            userChangeData.push(pushData)
                                        }
                                    })

                                    let companySetData = {organizations:[...changeData,...basicData]}

                                    Company.findOneAndUpdate({company:data.company},{$set:companySetData})
                                        .then(suc=>{
                                            User.bulkWrite(userChangeData.map((item)=>({
                                                updateOne:{
                                                    filter:{userId:item.userId},
                                                    update:{$set:item},
                                                    upsert:true
                                                }
                                                }))
                                            )
                                                .then(suc2=>{
                                                    if(data.loginData.affiliation.department === data.basic){
                                                        User.findOne({company:data.company,userId:data.loginData.info.userId})
                                                            .then(user=>{
                                                                let sendUserData = {
                                                                    company: user.company,
                                                                    affiliation:user.affiliation,
                                                                    info:{name:user.name,userId: user.userId,
                                                                        phone: user.phone},
                                                                    break:user.break,
                                                                    form:user.form,
                                                                    etc:user.etc,
                                                                    expiresDate:data.loginData.expiresDate
                                                                }
                                                                Company.findOne({company:data.company})
                                                                    .then(findData=>{
                                                                        res.status(200).json({msg:`기존부서 "${data.basic}" 의 부서명이 "${data.department}" 으로 수정 되었습니다.`
                                                                            ,companyData:findData,userData:sendUserData})
                                                                    })
                                                                    .catch(err=>{
                                                                        res.status(400).send(err)
                                                                    })

                                                            })
                                                    }else{
                                                        Company.findOne({company:data.company})
                                                            .then(findData=>{
                                                                res.status(200).json({msg:`기존부서 "${data.basic}" 의 부서명이 "${data.department}" 으로 수정 되었습니다.`
                                                                    ,companyData:findData,userData:"Not Change"})
                                                            })
                                                            .catch(err=>{
                                                                res.status(400).send(err)
                                                            })
                                                    }

                                                })
                                                .catch(err=>{
                                                    res.status(400).send(err)
                                                })

                                })

                            })
                                .catch(err=>{
                                    res.status(400).send(err)
                                })

                        })
                        .catch(err=>{
                            res.status(400).send(err)
                        })
                }

                if(types === 'departUpdate'){
                    if(reResponse === 'changeData'){
                        Company.findOneAndUpdate({company:data.loginData.company},{$set:data.companyData})
                            .then(suc=>{
                                User.bulkWrite(data.userData.map((item)=>({
                                        updateOne:{
                                            filter:{userId:item.userId},
                                            update:{$set:item},
                                            upsert:true
                                        }
                                    }))
                                ).then(suc2=>{
                                    Company.findOne({company:data.loginData.company})
                                        .then(companyAllData=>{
                                            let sendUser = false
                                            data.userData.map(item=>{
                                                if(item.userId === data.loginData.info.userId){
                                                    sendUser = true
                                                }
                                            })
                                            if(sendUser === true){
                                                User.findOne({userId:data.loginData.info.userId,phone:data.loginData.info.phone})
                                                    .then(user=>{
                                                        console.log(user)
                                                        let sendUserData = {
                                                            company: user.company,
                                                            affiliation:user.affiliation,
                                                            info:{name:user.name,userId: user.userId,
                                                                phone: user.phone},
                                                            break:user.break,
                                                            form:user.form,
                                                            etc:user.etc,
                                                            expiresDate:data.loginData.expiresDate
                                                        }
                                                        res.status(200).json({msg:`부서 데이터와 유저 데이터가 수정 되었습니다.`
                                                            ,companyData:companyAllData,userData:sendUserData})
                                                    })
                                            }else{
                                                res.status(200).json({msg:`부서 데이터와 유저 데이터가 수정 되었습니다.`
                                                    ,companyData:companyAllData,userData:'None'})
                                            }
                                        })

                                })
                            })


                    }else{
                        Company.findOne({company:data.company})
                            .then(allData=>{
                                User.find({company:data.company})
                                    .then(userData=>{
                                        let checkData = []
                                        let basicData =[]
                                        allData.organizations.map(e=>{
                                            if(e.department !== data.organizations.department){
                                                basicData.push(e)
                                            }
                                        })
                                        userData.map(item=>{
                                            if(item.affiliation.department === data.organizations.department){
                                                checkData.push(item)
                                            }
                                        })


                                        let macChangeData = checkData.filter((item)=>data.organizations.position.some((e)=> e.name === item.affiliation.position))
                                        let positionChangeData = checkData.filter(x=>!macChangeData.includes(x))

                                        if(positionChangeData.length === 0){
                                            //유저디비 맥주소 변경 후 업데이트
                                            let changeData = []
                                            macChangeData.map(e=>{
                                                if(e.affiliation.position === data.organizations.name){
                                                    let pushData = {
                                                        _id:e._id,
                                                        company:e.company,
                                                        affiliation:{
                                                            department:e.affiliation.department,
                                                            position:e.affiliation.position,
                                                            macAddress: data.organizations.mac,
                                                            _id:e.affiliation._id
                                                        },
                                                        name:e.name,
                                                        userId:e.userId,
                                                        password:e.password,
                                                        phone:e.phone,
                                                        break:e.break,
                                                        form:e.form,
                                                        etc:e.etc
                                                    }
                                                    changeData.push(pushData)
                                                }
                                            })

                                            let setData = {organizations:[data.organizations,...basicData]}
                                            Company.findOneAndUpdate({company:data.company},{$set:setData})
                                                .then(suc=>{
                                                    User.bulkWrite(changeData.map((item)=>({
                                                            updateOne:{
                                                                filter:{userId:item.userId},
                                                                update:{$set:item},
                                                                upsert:true
                                                            }
                                                        }))
                                                    )
                                                        .then(suc2=>{
                                                            Company.findOne({company:data.company})
                                                                .then(findData=>{
                                                                    if(data.loginData.affiliation.department === data.organizations.department){
                                                                        User.findOne({company:data.company,userId:data.loginData.info.userId})
                                                                            .then(user=>{
                                                                                let sendUserData = {
                                                                                    company: user.company,
                                                                                    affiliation:user.affiliation,
                                                                                    info:{name:user.name,userId: user.userId,
                                                                                        phone: user.phone},
                                                                                    break:user.break,
                                                                                    form:user.form,
                                                                                    etc:user.etc,
                                                                                    expiresDate:data.loginData.expiresDate
                                                                                }
                                                                                res.status(200).json({msg:`부서 ${data.organizations.department} 가(이) 수정 되었습니다.`
                                                                                    ,companyData:findData,userData:sendUserData})
                                                                            })
                                                                    }else{
                                                                        res.status(200).json({msg:`부서 ${data.organizations.department} 가(이) 수정 되었습니다.`
                                                                            ,companyData:findData,userData:'None'})
                                                                    }

                                                                })
                                                                .catch(err=>{
                                                                    res.status(400).send(err)
                                                                })
                                                        })

                                                })
                                                .catch(err=>{
                                                    res.status(400).send(err)
                                                })



                                        }else{
                                            //유저디비 포지션,맥주소 공백으로 업데이트
                                            let changeData = []
                                            let setData = {organizations:[data.organizations,...basicData]}
                                            positionChangeData.map(e=>{
                                                let pushData = {
                                                    _id:e._id,
                                                    company:e.company,
                                                    affiliation:{
                                                        department:e.affiliation.department,
                                                        position:"Selection Required",
                                                        macAddress: "Selection Required",
                                                        _id:e.affiliation._id
                                                    },
                                                    name:e.name,
                                                    userId:e.userId,
                                                    password:e.password,
                                                    phone:e.phone,
                                                    break:e.break,
                                                    form:e.form,
                                                    etc:e.etc
                                                }
                                                changeData.push(pushData)
                                            })
                                            res.status(200).json({msg:"Selection Required",userData:changeData,companyData:setData})
                                        }
                                    })


                            })
                            .catch(err=>{
                                res.status(400).send(err)
                            })
                    }
                }
                if(types === 'selectDelete'){
                    if(reResponse === 'changeData'){
                        Company.findOneAndUpdate({company:data.company},{$set:data.companyData})
                            .then(suc=>{
                                User.bulkWrite(data.userData.map((item)=>({
                                        updateOne:{
                                            filter:{userId:item.userId},
                                            update:{$set:item},
                                            upsert:true
                                        }
                                    }))
                                )
                                    .then(suc2=>{
                                        Company.findOne({company:data.company})
                                            .then(findData=>{
                                                User.findOne({company:data.company,userId:data.loginData.info.userId})
                                                    .then(user=>{
                                                        let sendUserData = {
                                                            company: user.company,
                                                            affiliation:user.affiliation,
                                                            info:{name:user.name,userId: user.userId,
                                                                phone: user.phone},
                                                            break:user.break,
                                                            form:user.form,
                                                            etc:user.etc,
                                                            expiresDate:data.loginData.expiresDate
                                                        }

                                                        res.status(200).json({msg:`부서 ${data.selectedData.map(e=>e.department)} 의 ${data.selectedData.map(e=>e.position)} 이(가) 삭제 되었습니다.`
                                                            ,companyData:findData,userData:sendUserData})
                                                    })
                                                    .catch(err=>{
                                                        console.log(err)
                                                    })

                                            })
                                            .catch(err=>{
                                                console.log(err)
                                                res.status(400).send(err)
                                            })
                                    })
                                    .catch(err=>{
                                        console.log(err)
                                    })
                            })
                            .catch(err=>{
                                console.log(err)
                            })
                    }else{
                        Company.findOne({company:data.company})
                            .then(allData =>{
                                User.find({company:data.company})
                                    .then(userData=>{
                                        let changeData = allData.organizations.filter((items)=>data.delPoint.some((e)=> e.department === items.department))
                                        let basicData = allData.organizations.filter(x=>!changeData.includes(x))
                                        let delData = data.delPoint
                                        let filterData = []

                                        delData.map(item=>{
                                            if(filterData.length === 0){
                                                let index = changeData.findIndex(x=>x.department === item.department)
                                                // let positionIndex = changeData[index].position.findIndex(x=>x.name === item.position)
                                                let filter = changeData
                                                for(let i =0; i < filter[index].position.length; i++){
                                                    if(filter[index].position[i].name === item.position ){
                                                        filter[index].position.splice(i,1)
                                                    }
                                                }
                                                filterData.push(filter)
                                            }else{
                                                let index = filterData[0].findIndex(x=>x.department === item.department)
                                                let filter = filterData[0]
                                                for(let i =0; i < filter[index].position.length; i++){
                                                    if(filter[index].position[i].name === item.position ){
                                                        filter[index].position.splice(i,1)
                                                    }
                                                }
                                                filterData[index] = filter
                                            }
                                        })
                                        let setData = {organizations:[...filterData[0],...basicData]}
                                        let delDepartment = []
                                        setData.organizations.map(e=>{
                                            if(e.position.length === 0){
                                                let filter = filterData[0].filter(x=>x.department !== e.department)
                                                setData = {organizations:[...filter,...basicData]}
                                                delDepartment.push(e.department)
                                            }
                                        })
                                        let changeUser = []

                                        userData.map(e => {
                                            data.delPoint.map(item => {
                                                if (item.department === e.affiliation.department) {
                                                    if (item.position === e.affiliation.position) {
                                                        changeUser.push(e)
                                                    }
                                                }
                                            })
                                        })
                                        if(changeUser.length !== 0){
                                            res.status(200).json({msg:`요청하신 ${data.delPoint.map(e=>e.department)} 부서에 등록 되어있는 직원들이 있어 부서변경 및 포지션 변경 후 데이터 삭제가 적용됩니다.`,
                                                companyData:setData,userData:changeUser})
                                        }else{
                                            Company.findOneAndUpdate({company:data.company},{$set:setData})
                                                .then(suc=>{
                                                    Company.findOne({company:data.company})
                                                        .then(companyData=>{
                                                            if(delDepartment.length === 0){
                                                                res.status(200).json({msg:`요청하신 ${data.delPoint.map(e=>e.department)} 부서의 포지션들이 삭제 되었습니다.`,
                                                                    companyData:companyData,userData:'None'})
                                                            }else{
                                                                res.status(200).json({msg:`요청하신 ${data.delPoint.map(e=>e.department)} 부서의 포지션들이 삭제되고 ${delDepartment} 부서의 데이터는 전체 삭제 되었습니다.`,
                                                                    companyData:companyData,userData:'None'})
                                                            }
                                                        })
                                                        .catch(err=>{
                                                            res.status(400).send(err)
                                                        })
                                                })
                                                .catch(err=>{
                                                    res.status(400).send(err)
                                                })
                                        }


                                    })

                            })
                    }

                }

                if(types === 'departmentDelete'){
                    if(reResponse === 'changeData'){
                        console.log(data)
                        Company.findOneAndUpdate({company:data.company},{$set:data.companyData})
                            .then(suc=>{
                                User.bulkWrite(data.userData.map((item)=>({
                                        updateOne:{
                                            filter:{userId:item.userId},
                                            update:{$set:item},
                                            upsert:true
                                        }
                                    }))
                                )
                                    .then(suc2=>{
                                        Company.findOne({company:data.company})
                                            .then(findData=>{
                                                User.findOne({company:data.company,userId:data.loginData.info.userId})
                                                    .then(user=>{
                                                        let sendUserData = {
                                                            company: user.company,
                                                            affiliation:user.affiliation,
                                                            info:{name:user.name,userId: user.userId,
                                                                phone: user.phone},
                                                            break:user.break,
                                                            form:user.form,
                                                            etc:user.etc,
                                                            expiresDate:data.loginData.expiresDate
                                                        }

                                                        res.status(200).json({msg:`부서 ${data.delDepartment} 이(가) 삭제 되었고, ${data.userData.map(e=>e.name)} 의 부서가 변경되었습니다.`
                                                            ,companyData:findData,userData:sendUserData})
                                                    })
                                                    .catch(err=>{
                                                        res.status(400).send(err)
                                                    })

                                            })
                                            .catch(err=>{

                                                res.status(400).send(err)
                                            })
                                    })
                                    .catch(err=>{
                                        res.status(400).send(err)
                                    })
                            })
                            .catch(err=>{
                                res.status(400).send(err)
                            })

                    }else{
                        User.find({company:data.companyData.company})
                            .then(allUserData=>{
                                let changeUserData = allUserData.filter((item)=>data.delDepartment === item.affiliation.department)
                                Company.findOne({company:data.companyData.company})
                                    .then(companyAllData=>{
                                        let setData = {organizations:companyAllData.organizations.filter(x=>!data.delDepartment.includes(x.department))}

                                        if(changeUserData.length === 0){
                                            Company.findOneAndUpdate({company:data.companyData.company},
                                                {$set:setData})
                                                .then(suc=>{
                                                    Company.findOne({company:data.companyData.company})
                                                        .then(finData=>{
                                                            res.status(200).json({msg:`요청하신 ${data.delDepartment} 부서가 삭제 되었습니다.`,
                                                                companyData:finData,userData:'None'})
                                                        })
                                                        .catch(err=>{
                                                            res.status(400).send(err)
                                                        })
                                                })
                                        }else{
                                            res.status(200).json({msg:'삭제 하려는 부서에 등록되어 있는 직원들의 부서 이동 후 부서가 삭제 됩니다.',
                                                userData:changeUserData,delPoint:data.delDepartment,companyData:setData})
                                        }

                                    })
                                    .catch(err=>{
                                        res.status(400).send(err)
                                    })

                            })
                            .catch(err=>{
                                res.status(400).send(err)
                            })
                    }

                }
            }


        },

        findService(req,res){
            const data = req.body

            if(data.admin === true){
                //기업정보
                Company.findOne({company:data.company})
                    .then(allData=>{
                        let filterData = []
                        let index = 0

                        if(data.selectBox.length === 0 || data.search.length === 0){
                            allData.organizations.map(e=>{
                                e.position.map(item=>{
                                    let filter = {
                                        id:`${index+=1}`,
                                        department:e.department,
                                        position:item.name,
                                        mac:item.mac
                                    }
                                    filterData.push(filter)
                                })
                            })
                            res.status(200).send(filterData)
                        }

                        if(data.selectBox === 'department'){
                            allData.organizations.map(e=>{
                                if(e.department.includes(data.search) === true){
                                    e.position.map(item=>{
                                        let filter = {
                                            id:`${index+=1}`,
                                            department:e.department,
                                            position:item.name,
                                            mac:item.mac
                                        }
                                        filterData.push(filter)
                                    })
                                }
                            })
                            res.status(200).send(filterData)
                        }

                        if(data.selectBox === 'position'){
                            allData.organizations.map(e=>{
                                e.position.map(item=>{
                                    if(item.name.includes(data.search)===true){
                                        let filter = {
                                            id:`${index+=1}`,
                                            department:e.department,
                                            position:item.name,
                                            mac:item.mac
                                        }
                                        filterData.push(filter)
                                    }
                                })
                            })
                            res.status(200).send(filterData)
                        }

                        if(data.selectBox === 'mac'){
                            allData.organizations.map(e=>{
                                e.position.map(item=>{
                                    item.mac.map(el=>{
                                        if(el.includes(data.search)===true){
                                            let filter = {
                                                id:`${index+=1}`,
                                                department:e.department,
                                                position:item.name,
                                                mac:item.mac
                                            }
                                            filterData.push(filter)
                                        }
                                    })
                                })
                            })
                            res.status(200).send(filterData)
                        }
                    })

            }else{
                //일반 찾기

            }

        },

        managerService(req,res){

        },



        // findData(req,res){
        //     const data = req.body
        //     let obj = {}
        //     obj[data.selectBox] = data.search
        //     if(data.admin === true){
        //         Company.find({company:data.company})
        //             .then(allData=>{
        //                 if(data.search.length === 0){
        //                     let sendData =[]
        //                     allData[0].responsibility.map(item=>{
        //                         let adminData = {
        //                             id:item.companyId,
        //                             name:item.name,
        //                             phone:item.phone,
        //                             email:item.email,
        //                             admin:item.admin ? 'O':'X'
        //                         }
        //                         sendData.push(adminData)
        //                     })
        //                     res.status(200).send(sendData)
        //                 }else if(data.selectBox === 'companyId'){
        //                     let sendData =[]
        //                     allData[0].responsibility.map(item=>{
        //                         if(item.companyId === data.search){
        //
        //                             let adminData = {
        //                                 id:item.companyId,
        //                                 name:item.name,
        //                                 phone:item.phone,
        //                                 email:item.email,
        //                                 admin:item.admin ? 'O':'X'
        //                             }
        //                             sendData.push(adminData)
        //                         }
        //                     })
        //                     res.status(200).send(sendData)
        //                 }else if(data.selectBox === 'name'){
        //                     let sendData =[]
        //                     allData[0].responsibility.map(item=>{
        //                         if(item.name === data.search){
        //                             let adminData = {
        //                                 id:item.companyId,
        //                                 name:item.name,
        //                                 phone:item.phone,
        //                                 email:item.email,
        //                                 admin:item.admin ? 'O':'X'
        //                             }
        //                             sendData.push(adminData)
        //                         }
        //                     })
        //                     res.status(200).send(sendData)
        //                 }else if(data.selectBox === 'phone'){
        //                     let sendData =[]
        //                     allData[0].responsibility.map(item=>{
        //                         if(item.phone === data.search){
        //                             let adminData = {
        //                                 id:item.companyId,
        //                                 name:item.name,
        //                                 phone:item.phone,
        //                                 email:item.email,
        //                                 admin:item.admin ? 'O':'X'
        //                             }
        //                             sendData.push(adminData)
        //                         }
        //                     })
        //                     res.status(200).send(sendData)
        //                 }else if(data.selectBox === 'email'){
        //                     let sendData =[]
        //                     allData[0].responsibility.map(item=>{
        //                         if(item.email === data.search){
        //                             let adminData = {
        //                                 id:item.companyId,
        //                                 name:item.name,
        //                                 phone:item.phone,
        //                                 email:item.email,
        //                                 admin:item.admin ? 'O':'X'
        //                             }
        //                             sendData.push(adminData)
        //                         }
        //                     })
        //                     res.status(200).send(sendData)
        //                 }
        //             })
        //             .catch(err=>{
        //                 res.status(400).send(err)
        //             })
        //     }else{
        //         obj['company'] = data.company
        //         if(data.search.length === 0 || data.selectBox.length === 0){
        //             User.find({company:data.company})
        //                 .then(findData=> {
        //                     let sendData = []
        //                     findData.map(e => {
        //                         let filter = {
        //                             department: e.department,
        //                             position: e.position,
        //                             id: e.userId,
        //                             birth: e.birth,
        //                             name: e.name,
        //                             phone: e.phone,
        //                             joinDate: e.joinDate
        //                         }
        //                         sendData.push(filter)
        //                     })
        //                     res.status(200).send(sendData)
        //                 })
        //                 .catch(err=>{
        //                     res.status(400).send(err)
        //                 })
        //         }else{
        //             User.find(obj)
        //                 .then(findData=>{
        //                     let sendData = []
        //                     findData.map(e=>{
        //                         let filter = {
        //                             department:e.department,
        //                             position:e.position,
        //                             id:e.userId,
        //                             birth:e.birth,
        //                             name:e.name,
        //                             phone:e.phone,
        //                             joinDate:e.joinDate
        //                         }
        //                         sendData.push(filter)
        //                     })
        //                     res.status(200).send(sendData)
        //                 })
        //                 .catch(err=>{
        //                     res.status(400).send(err)
        //                 })
        //         }
        //     }
        // },
        // getData(req,res){
        //
        //     const data= req.body
        //     User.find({company:data.company})
        //         .then(userData=>{
        //             Company.find({company:data.company})
        //                 .then(companyData=>{
        //                     res.status(200).json({userData:userData,companyData:companyData})
        //                 })
        //         })
        //         .catch(err=>{
        //             res.status(400).send(err)
        //         })
        //
        // },
        //
        // companyInfoUpdate(req,res){
        //     const data = req.body
        //     const params = req.query.contents
        //     const types = req.query.type
        //     const loadType = req.query.loadType
        //
        //     if(params === 'organization'){
        //         if(types === 'create'){
        //             Company.find({company:data.company})
        //                 .then(allData=>{
        //                     let duplicateDepartment = false
        //                     let basicData = []
        //                     allData[0].organizations.map(e=>{
        //                         if(e.department === data.data.department){
        //                             duplicateDepartment = true
        //                         }
        //                         basicData.push(e)
        //                     })
        //                     if(duplicateDepartment === true){
        //                         res.status(400).send(`요청하신 부서 : ${data.data.department}는(은) 이미 등록된 부서명 입니다.`)
        //                     }else{
        //                         let setData = { organizations: [...basicData,data.data]}
        //                         Company.findOneAndUpdate({company:data.company},{$set:setData})
        //                             .then(suc=>{
        //                                 res.status(200).send('Success')
        //                             })
        //                             .catch(err=>{
        //                                 res.status(400).send(err)
        //                             })
        //                     }
        //                 })
        //         }
        //         if(types === 'update'){
        //             let basicData = []
        //             let filterData = []
        //             Company.find({company:data.company})
        //                 .then(allData=>{
        //                     allData[0].organizations.map(item=>{
        //                             if(item.department === data.basicData.id){
        //                                 filterData.push(item)
        //                             }
        //                         basicData.push(item)
        //                     })
        //                     const filterBasic = basicData.concat(filterData).filter(item=> !basicData.includes(item) || !filterData.includes(item))
        //                     let finalData = {
        //                         organizations: [...filterBasic,data.data]
        //                     }
        //                     Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                         .then(suc=>{
        //                             res.status(200).send('Success')
        //                         })
        //                         .catch(e=>{
        //                             res.status(400).send(e)
        //                         })
        //                 })
        //                 .catch(err=>{
        //                     res.status(400).send(err)
        //                 })
        //         }
        //         if(types === 'del'){
        //             let basicData = []
        //             let filterData = []
        //             Company.find({company:data.company})
        //                 .then(allData=>{
        //                     allData[0].organizations.map(item=>{
        //                         data.delPoint.map(e=>{
        //                             if(item.department === e.id){
        //                                 filterData.push(item)
        //                             }
        //                         })
        //                         basicData.push(item)
        //                     })
        //                     let finalData = {
        //                         organizations: basicData.concat(filterData).filter(item=> !basicData.includes(item) || !filterData.includes(item))
        //                     }
        //                     Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                         .then(suc=>{
        //                             res.status(200).send('부서 정보가 정상적으로 삭제되었습니다.')
        //                         })
        //                         .catch(err=>{
        //                             res.status(400).send(err)
        //                         })
        //                 })
        //
        //         }
        //
        //         if(types === 'excel'){
        //
        //             if(loadType === 'Download'){
        //                 try {
        //                     let bodyData = [];
        //
        //                     data.filter((names)=>{
        //                         let dbs = {
        //                             '회사명':names.company,
        //                             '부서':names.id,
        //                             '직급':names.position
        //                         }
        //                         bodyData.push(dbs)
        //                     })
        //                     res.status(200).send(bodyData)
        //
        //                 }catch (e){
        //                     if(e.name === 'TokenExpiredError'){
        //                         res.status(500).send('로그인 시간이 만료되었습니다.')
        //                     }
        //                 }
        //             }
        //             if(loadType === 'Upload'){
        //
        //                 let uploadData = data.upload
        //                 let bodyData = [];
        //                 uploadData.filter((names)=>{
        //                     let dbs = {
        //                         department:names['부서'],
        //                         position:names['직급'].split(',')
        //                     }
        //                     bodyData.push(dbs)
        //                 })
        //                 Company.find({company:data.company})
        //                     .then(allData=>{
        //                         //부서 명 중복 확인(부서명 변경없음 데이터 추가됨- 정보가 2개라서), 부서명이 중복이면 직급 변경된지 확인
        //                         //부서명이 중복이면 => 직급 변경 없을 시 그대로 적용(변경시도 적용)
        //                         //부서명이 없으면 => 생성
        //                         let basicData = []
        //                         let duplicateDeepartment = []
        //                         allData[0].organizations.map(e=>{
        //                             bodyData.map(item=>{
        //                                 if(item.department === e.department){
        //                                     duplicateDeepartment.push(e)
        //                                 }
        //                             })
        //                             basicData.push(e)
        //                         })
        //                         //기존 데이터들 유지
        //                         const basicAddData = basicData.concat(duplicateDeepartment).filter(item=> !basicData.includes(item) || !duplicateDeepartment.includes(item))
        //                         let finalData = {organizations:[...basicAddData,...bodyData]}
        //                         Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                             .then(suc=>{
        //                                 res.status(200).send('Success')
        //                             })
        //                             .catch(err=>{
        //                                 res.status(400).send(err)
        //                             })
        //                     })
        //
        //             }
        //         }
        //
        //
        //     }
        //
        //     if(params === 'macAddress'){
        //         Company.find({})
        //             .then(allData=>{
        //                 let duplicateMac = false
        //                 let duplicateNumber =[]
        //                 allData.map(allCompany=>{
        //                     allCompany.macAddress.map(item=>{
        //                         if(allCompany.company !== data.company){
        //                             data.macInfo.map(e=>{
        //                                 if(e === item){
        //                                     duplicateMac = true
        //                                     duplicateNumber.push(e)
        //                                 }
        //                             })
        //                         }
        //                     })
        //                 })
        //                 if(duplicateMac === true){
        //                     res.status(400).send(`MacAddress : '${duplicateNumber}' 가 이미 사용 중입니다. 기기번호를 다시 한번 확인해주세요.`)
        //                 }else{
        //                     let setData = {macAddress:[...data.macInfo]}
        //                     Company.findOneAndUpdate({company:data.company},{$set:setData})
        //                         .then(suc=>{
        //                             const tokenData =req.cookies.companyInfoToken
        //                             const verify = jwt.verify(tokenData,COMPANY_SECRET)
        //                             Company.find({company:data.company})
        //                                 .then(findData=>{
        //                                     let sendData = {
        //                                         company:findData[0].company,
        //                                         organizations:findData[0].organizations,
        //                                         macAddress:findData[0].macAddress,
        //                                         responsibility:findData[0].responsibility,
        //                                         loginId:verify.loginId,
        //                                         manager:verify.manager,
        //                                         admin:verify.admin,
        //                                         approval: verify.approval,
        //                                         expireTime:verify.expireTime
        //                                     }
        //                                     res.status(200).json({
        //                                         msg:`MacAddress 수정 및 등록이 완료되었습니다.`,
        //                                         data:sendData
        //                                 })
        //                                 })
        //
        //                         })
        //                         .catch(err=>{
        //                             res.status(400).send(err)
        //                         })
        //                 }
        //             })
        //     }
        //
        //
        //     if(params === "companyIdRegister"){
        //         Company.find({company:data.company})
        //             .then(allData=>{
        //                 let duplicateId = false
        //                 let duplicatePhone = false
        //                 let duplicateEmail = false
        //                 let filterData = []
        //                 allData[0].responsibility.map(item=>{
        //                     if(item.companyId === data.companyId){
        //                         duplicateId = true
        //                     }
        //                     if(item.phone === data.phone){
        //                         duplicatePhone = true
        //                     }
        //                     if(item.email === data.email){
        //                         duplicateEmail = true
        //                     }
        //                     filterData.push(item)
        //                 })
        //                 if(duplicateId === true){
        //                     res.status(400).send('사용중인 기업아이디가 있습니다. 다시 한번 확인해주세요.')
        //                 }else if(duplicatePhone === true){
        //                     res.status(400).send('사용중인 담당자 전화번호 입니다. 다시 한번 확인해주세요.')
        //                 }else if(duplicateEmail === true){
        //                     res.status(400).send('사용중인 담당자 이메일 입니다. 다시 한번 확인해주세요.')
        //                 }else{
        //                     const bcryptPwData = bcrypt.hashSync(data.password, 10)
        //                     let setData = {
        //                         responsibility:[...filterData,{companyId:data.companyId,email:data.email,password: bcryptPwData,
        //                             name:data.name,phone:data.phone,admin:data.admin}]
        //                     }
        //
        //                     Company.findOneAndUpdate({company:data.company},{$set:setData})
        //                         .then(suc=>{
        //                             res.status(200).send('기업 아이디 생성 완료')
        //                         })
        //                         .catch(err=>{
        //                             res.status(400).send(err)
        //                         })
        //                 }
        //             })
        //     }
        //
        //     if(params === 'updateInfo'){
        //         Company.find({company:data.company})
        //             .then(allData=>{
        //                 let fd = [data]
        //                 let basicData = []
        //                 let filterData = []
        //                 let duplicatePhone = false
        //                 let duplicateEmail = false
        //
        //                 allData[0].responsibility.map(item=>{
        //                     if(item.companyId === data.companyId){
        //                         filterData.push(item)
        //                     }
        //                     if(item.phone === data.phone){
        //                         duplicatePhone = true
        //                     }
        //                     if(item.email === data.email){
        //                         duplicateEmail = true
        //                     }
        //                     basicData.push(item)
        //                 })
        //                 if(duplicatePhone === true){
        //                     res.status(400).send('사용중인 담당자 전화번호 입니다. 다시 한번 확인해주세요.')
        //                 }else if(duplicateEmail === true){
        //                     res.status(400).send('사용중인 담당자 이메일 입니다. 다시 한번 확인해주세요.')
        //                 }else{
        //                     let setData = []
        //
        //                     const bcryptPwData = bcrypt.hashSync(data.password, 10)
        //
        //                     fd.map(e=>{
        //                         let pushData = {
        //                             companyId:e.companyId,
        //                             email:e.email === 'plane' ? filterData[0].email:e.email,
        //                             password:e.password === 'plane' ? filterData[0].password:bcryptPwData,
        //                             name:e.name,
        //                             phone:e.phone === 'plane' ? filterData[0].phone:e.phone,
        //                             admin:e.admin === 'plane' ? filterData[0].admin:e.admin,
        //                         }
        //                         setData.push(pushData)
        //                     })
        //                     const updateData = basicData.filter(e=>e.companyId != data.companyId)
        //
        //                     let finalData = {
        //                         responsibility:[...updateData,...setData]
        //                     }
        //
        //                     Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                         .then(suc=>{
        //                             res.status(200).send('기업 단일 정보 수정 완료.')
        //                         })
        //                         .catch(err=>{
        //                             res.status(400).send(err)
        //                         })
        //
        //                 }
        //
        //             })
        //             .catch(err=>{
        //                 res.status(400).send(err)
        //             })
        //     }
        //
        //     if(params === 'delAdmin'){
        //         Company.find({company:data.company})
        //             .then(allData=>{
        //                 let basicData = []
        //                 let filterData = []
        //                 allData[0].responsibility.map(item=>{
        //                     data.delPoint.map(e=>{
        //                         if(item.companyId === e.id){
        //                            filterData.push(item)
        //                         }
        //                     })
        //                     basicData.push(item)
        //                 })
        //                 let finalData = {
        //                     responsibility: basicData.concat(filterData).filter(item=> !basicData.includes(item) || !filterData.includes(item))
        //                 }
        //
        //                 Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                     .then(suc=>{
        //                         res.status(200).send('기업 아이디가 정상적으로 삭제되었습니다.')
        //                     })
        //                     .catch(err=>{
        //                         res.status(400).send(err)
        //                     })
        //
        //             })
        //             .catch(err=>{
        //                 res.status(400).send(err)
        //             })
        //     }
        //
        //
        //
        //     if(params === 'upload'){
        //         let uploadData = data.upload
        //         let bodyData = [];
        //         uploadData.filter((names)=>{
        //             let dbs = {
        //                 company:names['회사명'],
        //                 companyId:names['기업 아이디'],
        //                 name:names['담당자 이름'],
        //                 password:names['비밀번호'],
        //                 phone:names['담당자 전화번호'],
        //                 email:names['담당자 이메일'],
        //                 admin:names['관리자 여부'] === 'O' ? true:false
        //             }
        //             bodyData.push(dbs)
        //         })
        //         //console.log(bodyData)
        //         Company.find({company:data.company})
        //             .then(allData=>{
        //                 let basicData =[]
        //                 let newData =[]
        //                 let defaultData =[]
        //                 let updateData = []
        //                 let duplicateId = false
        //                 let duplicatePhone = false
        //                 let duplicateEmail = false
        //
        //                 allData[0].responsibility.map(item=>{
        //                     bodyData.map(e=>{
        //                         let bcryptPwData
        //                         if(e.password !== undefined){
        //                             bcryptPwData = bcrypt.hashSync(e.password, 10)
        //                         }
        //
        //                         if(item.companyId === e.companyId && item.name === e.name){
        //                             let pushData ={
        //                                 _id:item._id,
        //                                 companyId:item.companyId,
        //                                 name:item.name,
        //                                 password: e.password === undefined ? item.password : bcryptPwData,
        //                                 phone: e.phone !== item.phone ? e.phone : item.phone,
        //                                 email: e.email !== item.email ? e.email : item.email,
        //                                 admin: e.admin !== item.admin ? e.admin : item.admin
        //                             }
        //                             updateData.push(pushData)
        //                             newData.push(e)
        //                             defaultData.push(item)
        //                         }else{
        //                             if(item.companyId === e.companyId){
        //                                 duplicateId =true
        //                             }
        //                             if(item.phone === e.phone){
        //                                 duplicatePhone =true
        //                             }
        //                             if(item.email === e.email){
        //                                 duplicateEmail =true
        //                             }
        //                         }
        //                     })
        //                     basicData.push(item)
        //                 })
        //                 let newUploadData = bodyData.concat(newData).filter(item=> !bodyData.includes(item) || !newData.includes(item))
        //                 let defaultDbData = basicData.concat(defaultData).filter(item=> !basicData.includes(item) || !defaultData.includes(item))
        //
        //                 if(duplicateId === true){
        //                     res.status(400).send('사용중인 기업아이디가 있습니다. 다시 한번 확인해주세요.')
        //                 }else if(duplicatePhone === true){
        //                     res.status(400).send('사용중인 담당자 전화번호 입니다. 다시 한번 확인해주세요.')
        //                 }else if(duplicateEmail === true){
        //                     res.status(400).send('사용중인 담당자 이메일 입니다. 다시 한번 확인해주세요.')
        //                 }else{
        //                     //업데이트데이터, 디폴트데이터 끝
        //                     let filterData =[]
        //                     newUploadData.map(item=>{
        //                         const bcryptPwData = bcrypt.hashSync(item.password, 10)
        //                         let pushData ={
        //                             companyId:item.companyId,
        //                             name:item.name,
        //                             password: bcryptPwData,
        //                             phone: item.phone,
        //                             email: item.email,
        //                             admin: item.admin
        //                         }
        //                         filterData.push(pushData)
        //                     })
        //                     let finalData = {
        //                         responsibility: [...defaultDbData,...updateData,...filterData]
        //                     }
        //
        //                     Company.findOneAndUpdate({company:data.company},{$set:finalData})
        //                         .then(suc=>{
        //                             res.status(200).send('엑셀 업로드가 완료되었습니다.')
        //                         })
        //                         .catch(err=>{
        //                             res.status(400).send(err)
        //                         })
        //
        //                 }
        //
        //             })
        //     }
        //
        //     if(params === 'download'){
        //         try {
        //             const data = req.body;
        //
        //             let bodyData = [];
        //
        //             data.filter((names)=>{
        //                 let dbs = {
        //                     '회사명':names.company,
        //                     '기업 아이디':names.id,
        //                     '담당자 이름':names.name,
        //                     '담당자 전화번호':names.phone,
        //                     '담당자 이메일':names.email,
        //                     '관리자 여부':names.admin
        //                 }
        //                 bodyData.push(dbs)
        //             })
        //             res.status(200).send(bodyData)
        //
        //
        //
        //         }catch (e){
        //             if(e.name === 'TokenExpiredError'){
        //                 res.status(500).send('로그인 시간이 만료되었습니다.')
        //             }
        //         }
        //     }
        //
        // },





    }
}