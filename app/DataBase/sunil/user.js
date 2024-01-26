//개통정보
export default function User(mongoose){
    const userSchema = new mongoose.Schema({
        serial:{type:[String]},
        contract_num:{type:String,required:true,unique:true},
        device_id:{type:[String]},
        company:{type:String,required:true},
        name:{type:String,required:true},
        contract_service:{type:String,required:true},
        id:{type:String,required:true,unique:true},
        addr:{type:String,required:true},
        tel:{type:String,required:true},
        communication: {type:String,required:true},
        service_name:{type:String,required:true},
        service_start: {type:String,required:true},
        service_end: {type:String,required:true},
        start_up:{type:String,required:true}
    },{versionKey : false})
    return mongoose.model('User',userSchema)
}