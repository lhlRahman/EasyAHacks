// server.js
import express from 'express';
import { config } from 'dotenv';
import { mintRaceNFT, mintAchievementNFT, PINATA_GATEWAY, getSdk } from './nftFunctions.js';
import { generateImage, getGeocode, gptCompletion } from './gpt.js';

config();

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

app.post('/mint-nft', async (req, res) => {
    try {
        const {
            score,
            fastestLap,
            lapTimes,
            topSpeed,
            averageSpeed,
            crashes,
            totalRaceTime,
            carType,
            playerCount,
            playerAddress,
            achievementTitle,
            achievementDescription,
            achievementPoints
        } = req.body;

        if (!playerAddress) {
            return res.status(400).json({ error: 'Player address is required' });
        }

        const nftData = {
            score,
            fastestLap,
            lapTimes,
            topSpeed,
            averageSpeed,
            crashes,
            totalRaceTime,
            carType,
            playerCount,
            playerAddress,
            achievementTitle,
            achievementDescription,
            achievementPoints
        };

        // Check account balance before minting
        const { account } = getSdk();
        console.log('Minting account:', account.address);

        const mintResult = await mintRaceNFT(nftData);
        res.json(mintResult);

    } catch (error) {
        console.error('Error minting NFT:', error);
        res.status(500).json({ 
            error: 'Failed to mint NFT', 
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

app.post('/mint-achievement', async (req, res) => {
    try {
        const {
            playerAddress,
            title,
            description,
            points
        } = req.body;

        if (!playerAddress || !title || !description || !points) {
            return res.status(400).json({ error: 'Player address, title, description, and points are required' });
        }

        const achievementData = {
            playerAddress,
            title,
            description,
            points
        };

        const mintResult = await mintAchievementNFT(achievementData);
        res.json(mintResult);

    } catch (error) {
        console.error('Error minting achievement NFT:', error);
        res.status(500).json({ 
            error: 'Failed to mint achievement NFT', 
            details: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
    }
});

app.post('/generate-image', async (req, res) => {
    try {
        const imageUrl = await generateImage();
        if (!imageUrl) {
            return res.status(500).json({ error: 'Failed to generate image' });
        }

        res.json({ imageUrl });
    } catch (error) {
        console.error('Error generating image:', error);
        res.status(500).json({ error: 'Failed to generate image', details: error instanceof Error ? error.message : String(error) });
    }
});

app.get('/geocode', async (req, res) => {
    try {
        const { location } = req.query;
        if (!location) {
            return res.status(400).json({ error: 'Location is required' });
        }

        const { lat, lng, city, country } = await getGeocode(location);
        res.json({ latitude: lat, longitude: lng, city, country });
    } catch (error) {
        console.error('Error geocoding:', error);
        res.status(500).json({ error: 'Failed to geocode location', details: error instanceof Error ? error.message : String(error) });
    }
});

app.post('/gpt-completion', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Valid messages array is required' });
        }

        const completion = await gptCompletion(messages);
        res.json(completion);
    } catch (error) {
        console.error('Error in GPT completion:', error);
        res.status(500).json({ error: 'Failed to get GPT completion', details: error instanceof Error ? error.message : String(error) });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});