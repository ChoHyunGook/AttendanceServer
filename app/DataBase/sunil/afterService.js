// as 서비스
export default function AfterService(mongoose) {
    const afterServiceSchema = new mongoose.Schema({
        serial: {type: [String]},
        device_id: {type: [String]},
        id: {type: String},
        //여기서 컨펌은 a/s, delivery 배송일경우 Product의, content 내용, location 지역(주소)
        state: {
            type:{
                check: {state: Boolean, date: String},//주문 확인중
                ready: {state: Boolean, date: String},//준비중
                production: {state: Boolean, date: String},//제작중
                delivery: {state: Boolean, date: String},//배송중
                complete: {state: Boolean, date: String}//완료
            }
        }
    }, {versionKey: false})
    return mongoose.model('AfterService', afterServiceSchema)
}