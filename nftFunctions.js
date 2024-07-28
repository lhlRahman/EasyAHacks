// nftFunctions.js
import { Sr25519Account } from "@unique-nft/sr25519";
import { Sdk, CHAIN_CONFIG } from '@unique-nft/sdk/full';
import { config } from 'dotenv';
import FormData from 'form-data';
import { generateImage } from './gpt.js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

config();

const PINATA_JWT = process.env.IPFS || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmM2EwNTVhYS1hYmQ2LTRlZDYtOTU5Yy1iMGJkZmVjMDViMTMiLCJlbWFpbCI6ImxobHJhaG1hbkBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJpZCI6IkZSQTEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX0seyJpZCI6Ik5ZQzEiLCJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MX1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmNkZDQ3ZjA0Y2M5MGY1YjhhMDEiLCJzY29wZWRLZXlTZWNyZXQiOiIwM2E4ZmM0NDNkYzJiMjNlNjVmOGU4MTllZTlkZTMyNjBjNmI3M2ZmNGFiYjBhM2M2MzAxNDBiZWUyYTY2ZWIxIiwiaWF0IjoxNzIyMDk2NjYwfQ.cQPYfszcpi57cvjHcjl3afVY8Lr3RNS4TvZpSGUVA9Q';
export const PINATA_GATEWAY = process.env.IPFS_GATEWAY || 'https://aquamarine-rainy-kangaroo-939.mypinata.cloud';

export const getSdk = (m) => {
    const mnemonic = m || process.env.MNEMONIC || "because discover output shoe kind survey pipe slush air cigar result crater";
    if (!mnemonic) {
        throw new Error('Mnemonic is not provided. Please set the MNEMONIC environment variable.');
    }
    const account = Sr25519Account.fromUri(mnemonic);
    const sdk = new Sdk({
        baseUrl: process.env.UNIQUE_NETWORK_BASE_URL || 'https://rest.unique.network/unique/v1',
        account,
    });

    return { sdk, account };
};

export async function pinFileToIPFS(filePath) {
    try {
        const data = new FormData();
        const file = fs.createReadStream(filePath);
        data.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`,
            },
            body: data,
        });

        const result = await response.json();
        return result.IpfsHash;
    } catch (error) {
        console.error('Error in pinFileToIPFS:', error);
        throw error;
    }
}

export async function createCollection(name, description, symbol, coverImageUrl) {
    const { sdk, account } = getSdk();
    
    const collectionSchema = {
        schemaName: 'unique',
        schemaVersion: '1.0.0',
        image: {
            urlTemplate: `${PINATA_GATEWAY}/ipfs/{infix}`
        },
        coverPicture: {
            url: coverImageUrl,
        },
        attributesSchemaVersion: '1.0.0',
        attributesSchema: {
            postRace: {
                type: 'object',
                required: ['score', 'fastestLap', 'lapTimes', 'topSpeed', 'averageSpeed', 'crashes', 'totalRaceTime', 'carType', 'playerCount'],
                properties: {
                    score: { type: 'integer' },
                    fastestLap: { type: 'integer' },
                    lapTimes: { type: 'array', items: { type: 'integer' } },
                    topSpeed: { type: 'integer' },
                    averageSpeed: { type: 'integer' },
                    crashes: { type: 'integer' },
                    totalRaceTime: { type: 'integer' },
                    carType: { type: 'integer' },
                    playerCount: { type: 'integer' }
                }
            },
            postAchievement: {
                type: 'object',
                required: ['title', 'description', 'points'],
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    points: { type: 'integer' }
                }
            }
        }
    };

    const collectionResult = await sdk.collection.createV2({
        name,
        description,
        symbol,
        cover_image: { url: coverImageUrl },
        permissions: { nesting: { collectionAdmin: true } },
        encodeOptions: {
            overwriteTPPs: [
                {
                    key: 'tokenData',
                    permission: {
                        collectionAdmin: true, tokenOwner: false, mutable: true
                    }
                }
            ],
        },
        schema: collectionSchema,
        tokenPropertyPermissions: [
            { key: 'postRace', permission: { mutable: true, collectionAdmin: true, tokenOwner: false } },
            { key: 'postAchievement', permission: { mutable: true, collectionAdmin: true, tokenOwner: false } }
        ]
    });

    if (!collectionResult.parsed) throw Error('Cannot parse minted collection');
    
    const collectionId = collectionResult.parsed.collectionId;
    console.log('Collection created:', collectionId);
    console.log(`Explore your collection: https://uniquescan.io/unique/collections/${collectionId}`);
    return collectionId;
}

export async function mintNFT(collectionId, nftData) {
    const { account, sdk } = getSdk();

    const {
        score,
        fastestLap,
        lapTimes,
        topSpeed,
        averageSpeed,
        eliminations,
        totalRaceTime,
        carType,
        playerAddress,
        imageCid,
    } = nftData;

    console.log(nftData);

    try {
        const mintResult = await sdk.token.createV2({
            collectionId: 688,
            image: `${PINATA_GATEWAY}/ipfs/${imageCid}`,
            owner: playerAddress,
            attributes: [
                {
                    trait_type: "Score",
                    value: score
                },
                {
                    trait_type: "FastestLap",
                    value: fastestLap
                },
                {
                    trait_type: "LapTimes",
                    value: JSON.stringify(lapTimes)
                },
                {
                    trait_type: "TopSpeed",
                    value: topSpeed
                },
                {
                    trait_type: "AverageSpeed",
                    value: averageSpeed
                },
                {
                    trait_type: "TotoalEliminations",
                    value: eliminations
                },
                {
                    trait_type: "TotalRaceTime",
                    value: totalRaceTime
                },
                {
                    trait_type: "CarType",
                    value: carType
                },
            ]
        });

        console.log(mintResult);
        return mintResult.parsed;
    } catch (error) {
        console.log("ERROR in mintNFT:", error);
        throw error;
    }
}

export async function mintRaceNFT(nftData) {
    try {
        const collectionId = 688; // Use your actual collection ID

        console.log("Generating image...");
        const imageUrl = await generateImage();
        if (!imageUrl) {
            throw new Error('Failed to generate image');
        }
        console.log("Image generated:", imageUrl);

        console.log("Downloading image...");
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.buffer();

        // Save the image locally
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const localImagePath = path.join(tempDir, 'race_nft_image.png');
        fs.writeFileSync(localImagePath, imageBuffer);

        console.log("Uploading image to IPFS...");
        const imageCid = await pinFileToIPFS(localImagePath);
        console.log("Image uploaded to IPFS. CID:", imageCid);

        const fullNftData = {
            ...nftData,
            imageCid: imageCid,
        };

        console.log("Minting NFT with data:", JSON.stringify(fullNftData, null, 2));
        const mintResult = await mintNFT(collectionId, fullNftData);
        console.log("Mint result:", mintResult);

        return {
            message: 'NFT minted successfully!',
            tokenId: mintResult.tokenId,
            owner: mintResult.owner,
            imageUrl: imageUrl
        };

    } catch (error) {
        console.error("Error in mintRaceNFT:", error);
        throw error;
    }
}

export async function createAchievementCollection(name, description, symbol, coverImageUrl) {
    const { sdk, account } = getSdk();
    
    const collectionSchema = {
        schemaName: 'unique',
        schemaVersion: '1.0.0',
        image: {
            urlTemplate: `${PINATA_GATEWAY}/ipfs/{infix}`
        },
        coverPicture: {
            url: coverImageUrl,
        },
        attributesSchemaVersion: '1.0.0',
        attributesSchema: {
            achievement: {
                type: 'object',
                required: ['title', 'description', 'points'],
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    points: { type: 'integer' }
                }
            }
        }
    };

    const collectionResult = await sdk.collection.createV2({
        name,
        description,
        symbol,
        cover_image: { url: coverImageUrl },
        permissions: { nesting: { collectionAdmin: true } },
        encodeOptions: {
            overwriteTPPs: [
                {
                    key: 'tokenData',
                    permission: {
                        collectionAdmin: true, tokenOwner: false, mutable: true
                    }
                }
            ],
        },
        schema: collectionSchema,
        tokenPropertyPermissions: [
            { key: 'achievement', permission: { mutable: true, collectionAdmin: true, tokenOwner: false } }
        ]
    });

    if (!collectionResult.parsed) throw Error('Cannot parse minted collection');
    
    const collectionId = collectionResult.parsed.collectionId;
    console.log('Achievement Collection created:', collectionId);
    console.log(`Explore your achievement collection: https://uniquescan.io/unique/collections/${collectionId}`);
    return collectionId;
}

export async function mintAchievementNFT(nftData) {
    try {
        const collectionId = 689; // Use your actual collection ID

        console.log("Generating image...");
        const imageUrl = await generateImage();
        if (!imageUrl) {
            throw new Error('Failed to generate image');
        }
        console.log("Image generated:", imageUrl);

        console.log("Downloading image...");
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.buffer();

        // Save the image locally
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
        const localImagePath = path.join(tempDir, 'achievement_nft_image.png');
        fs.writeFileSync(localImagePath, imageBuffer);

        console.log("Uploading image to IPFS...");
        const imageCid = await pinFileToIPFS(localImagePath);
        console.log("Image uploaded to IPFS. CID:", imageCid);

        const { account, sdk } = getSdk();

        const {
            playerAddress,
            title,
            description,
            points
        } = nftData;

        const mintResult = await sdk.token.createV2({
            collectionId,
            image: `${PINATA_GATEWAY}/ipfs/${imageCid}`,
            owner: playerAddress,
            attributes: [
                {
                    trait_type: "AchievementTitle",
                    value: title
                },
                {
                    trait_type: "AcheivementDescription",
                    value: description
                },
                {
                    trait_type: "achcivementPoints",
                    value: points
                },
            ]
        });

        console.log("Mint result:", mintResult);

        return {
            message: 'Achievement NFT minted successfully!',
            tokenId: mintResult.parsed.tokenId,
            owner: mintResult.parsed.owner,
            imageUrl: imageUrl
        };

    } catch (error) {
        console.error("Error in mintAchievementNFT:", error);
        throw error;
    }
}

export async function main() {
    try {
        console.log("Starting manual NFT minting test...");

        const testNftData = {
            score: 1000,
            fastestLap: 75,
            lapTimes: [78, 76, 75, 77],
            topSpeed: 280,
            averageSpeed: 220,
            crashes: 0,
            totalRaceTime: 306,
            carType: 1,
            playerCount: 8,
            playerAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // Replace with actual player address
            achievementTitle: 'Flawless Victory',
            achievementDescription: 'Complete a race without crashing',
            achievementPoints: 100
        };

        console.log("Minting NFT with test data:", testNftData);

        const result = await mintRaceNFT(testNftData);

        console.log("NFT minted successfully!");
        console.log("Result:", result);

    } catch (error) {
        console.error("Error in manual minting test:", error);
    }
}

export async function generateAndUploadImages(count = 50) {
    const cidArray = [];
    const tempDir = path.join(process.cwd(), 'temp');

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    for (let i = 0; i < count; i++) {
        try {
            console.log(`Generating and uploading image ${i + 1} of ${count}...`);

            // Generate image
            const imageUrl = await generateImage();
            if (!imageUrl) {
                throw new Error('Failed to generate image');
            }

            // Download image
            const imageResponse = await fetch(imageUrl);
            const imageBuffer = await imageResponse.buffer();

            // Save image locally
            const localImagePath = path.join(tempDir, `image_${i + 1}.png`);
            fs.writeFileSync(localImagePath, imageBuffer);

            // Upload to IPFS
            const imageCid = await pinFileToIPFS(localImagePath);
            cidArray.push(imageCid);

            // Clean up local file
            fs.unlinkSync(localImagePath);

            console.log(`Image ${i + 1} uploaded. CID: ${imageCid}`);
        } catch (error) {
            console.error(`Error processing image ${i + 1}:`, error);
        }
    }

    // Print the CID array
    console.log('All CIDs:');
    console.log(JSON.stringify(cidArray, null, 2));

    return cidArray;
}

export async function getRacesByPlayer(playerAddress, collectionId = 688) {
    const { sdk } = getSdk();

    const { tokens } = await sdk.tokens.accountTokens({
        address: playerAddress,
        collectionId: collectionId
    });

    let all = tokens.map(token => token.tokenId);

    let parsedRaces = [];
    for (let i = 0; i < all.length; i++) {
        const token = await sdk.token.get({
            collectionId: collectionId,
            tokenId: all[i]
        });

        if (token.properties && token.properties.length > 2) {
            const raceDataString = token.properties[2].value;
            try {
                const raceData = JSON.parse(raceDataString);
                const parsedRace = {
                    tokenId: all[i],
                    image: raceData.image,
                    score: raceData.attributes.find(attr => attr.trait_type === "Score")?.value,
                    fastestLap: raceData.attributes.find(attr => attr.trait_type === "FastestLap")?.value,
                    lapTimes: JSON.parse(raceData.attributes.find(attr => attr.trait_type === "LapTimes")?.value || "[]"),
                    topSpeed: raceData.attributes.find(attr => attr.trait_type === "TopSpeed")?.value,
                    averageSpeed: raceData.attributes.find(attr => attr.trait_type === "AverageSpeed")?.value,
                    eliminations: raceData.attributes.find(attr => attr.trait_type === "Totaleliminations")?.value,
                    totalRaceTime: raceData.attributes.find(attr => attr.trait_type === "TotalRaceTime")?.value,
                    carType: raceData.attributes.find(attr => attr.trait_type === "CarType")?.value,
                };
                parsedRaces.push(parsedRace);
            } catch (error) {
                console.error(`Error parsing race data for token ${all[i]}:`, error);
            }
        }
    }

    return parsedRaces;
}

export async function getAchievementsByPlayer(playerAddress, collectionId = 689) {
    const { sdk } = getSdk();

    const { tokens } = await sdk.tokens.accountTokens({
        address: playerAddress,
        collectionId: collectionId
    });

    let all = tokens.map(token => token.tokenId);

    let parsedAchievements = [];
    for (let i = 0; i < all.length; i++) {
        const token = await sdk.token.get({
            collectionId: collectionId,
            tokenId: all[i]
        });

        if (token.properties && token.properties.length > 2) {
            const achievementDataString = token.properties[2].value;
            try {
                const achievementData = JSON.parse(achievementDataString);
                const parsedAchievement = {
                    tokenId: all[i],
                    image: achievementData.image,
                    title: achievementData.attributes.find(attr => attr.trait_type === "AchievementTitle")?.value,
                    description: achievementData.attributes.find(attr => attr.trait_type === "AcheivementDescription")?.value,
                    points: achievementData.attributes.find(attr => attr.trait_type === "achcivementPoints")?.value
                };
                parsedAchievements.push(parsedAchievement);
            } catch (error) {
                console.error(`Error parsing achievement data for token ${all[i]}:`, error);
            }
        }
    }

    return parsedAchievements;
}

