//배송
export default function Customer(mongoose) {
    const customerSchema = new mongoose.Schema({
        serial: {type: [String]},
        device_id: {type: [String]},
        id: {type: String},
        section: {type: { order:String,content:String, location:String, schedule:String, date:String }},
        state: {
            type:{
                check: {state: Boolean, date: String},//주문 확인중
                ready: {state: Boolean, date: String},//준비중
                production: {state: Boolean, expect:String, date: String},//제작중
                delivery: {state: Boolean, expect:String, date: String},//배송중
                complete: {state: Boolean, date: String}//완료
            }
        }
    }, {versionKey: false})
    return mongoose.model('Customer', customerSchema)
}