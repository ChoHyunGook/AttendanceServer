//출고관리
export default function Product(mongoose){
    const productSchema = new mongoose.Schema({
        serial: {type: [String]},
        model: {type: [String]},
        device_id: {type: [String]},
        info: {
            type: {
                order: String,
                date: String
            }
        },
        id: {type: String}
    }, {versionKey: false})
    return mongoose.model('Product',productSchema)
}