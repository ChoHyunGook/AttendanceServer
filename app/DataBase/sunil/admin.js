

//어드민
export default function Admin(mongoose){
    const userSchema = new mongoose.Schema({
        name:{type:String,required:true},
        id:{type:String,required:true,unique:true},
        phone:{type:String,required:true},
        admin:{type:{
                master:Boolean,
                release:Boolean,
                customer:Boolean,
                delivery:Boolean
            }}
    },{versionKey : false})
    return mongoose.model('Admin',userSchema)
}