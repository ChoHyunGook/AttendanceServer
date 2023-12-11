//
// 기본 틀 => 지문인식기 구매 후 구매한 회사명 만 등록되게끔 => 웹 관리자
//     "company": "회사명",
//     "organizations": [],
//     "macAddress": [],
//     "responsibility": [],
//     "approval": false
//
export default function CompanyInfo(mongoose) {
    const CompanySchema = new mongoose.Schema({
        company: {type: String},
        organizations: {type:[{department:String,position:[{name:String,mac:[String]}]}]},
        macAddress:{type:[String]}
    }, {versionKey: false})

    return mongoose.model('CompanyInfo', CompanySchema)
}

