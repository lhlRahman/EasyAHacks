// gpt.js
import OpenAI from 'openai';
import axios from 'axios';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';
import { storage } from "./firebase.js";
import { config } from 'dotenv';

config();


const googleMapsApiKey = process.env.GOOGLE;

const openai = new OpenAI({
	apiKey: process.env.GPT || "sk-proj-s17DSphMQ7d2HGTDhS0bT3BlbkFJTBhwT4LgOwvGzEmGRmib",
});

async function gptCompletion(messages) {
	const chatCompletion = await openai.chat.completions.create({
		messages: messages,
		model: 'gpt-4o',
	});
	return chatCompletion.choices[0];
}




async function getGeocode(location) {
	const response = await axios.get(
		'https://maps.googleapis.com/maps/api/geocode/json',
		{
			params: {
				address: location,
				key: googleMapsApiKey,
			},
		}
	);



	const { results } = response.data;

    console.log(results)
	const city = results[0].address_components.find((component) =>
		component.types.includes('locality')
	).long_name;
	const country = results[0].address_components.find((component) =>
		component.types.includes('country')
	).long_name;

	if (results.length === 0) {
		throw new Error('Location not found');
	}

	const { lat, lng } = results[0].geometry.location;
	return { lat, lng, city, country };
}



async function generateImage(image_description = "make a hyper realistics image of a racing car for a NFT") {

  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: image_description,
      n: 1, // Number of images to generate
      size: '1024x1024', // Size of the generated image
    });

    const imageUrl = response.data[0].url;

    // Fetch the image as a blob
    const imageResponse = await fetch(imageUrl);
    const blob = await imageResponse.blob();

    // Generate a unique file name
    const storageRef = ref(storage, `uploads/${uuidv4()}`);
    
    // Upload the blob to Firebase Storage
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('File uploaded successfully');

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File available at', downloadURL);
    
    return downloadURL;

  } catch (error) {
    console.error('Error generating image:', error);
    return null; // Returning null to indicate failure
  }
}



export {
    generateImage, 
    getGeocode,
    gptCompletion

};