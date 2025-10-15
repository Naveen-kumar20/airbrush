import mongoose from 'mongoose';

// Get all generators
export const getAllGenerators = async (req, res) => {
    try {
        const collection = mongoose.connection.collection('generator-collection');
        const generators = await collection.find({}).toArray();
        
        res.status(200).json({
            success: true,
            data: generators
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get a single generator by ID
export const getGeneratorById = async (req, res) => {
    try {
        const { id } = req.params;
        const collection = mongoose.connection.collection('generator-collection');
        
        const generator = await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
        
        if (!generator) {
            return res.status(404).json({
                success: false,
                error: 'Generator not found'
            });
        }

        res.status(200).json({
            success: true,
            data: generator
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 