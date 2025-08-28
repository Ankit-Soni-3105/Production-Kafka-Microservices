import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
    _id: {
        type: String
    }, // chatId
    seq: {
        type: Number,
        default: 0
    }
});

const counterModel = mongoose.model('counter', CounterSchema);

export default counterModel;
