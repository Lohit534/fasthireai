const axios = require("axios");

async function main() {
  console.log("Calling local /api/optimize...");
  try {
    const response = await axios.post("http://localhost:3000/api/optimize", {
      resumeText: "Jane Doe\njane@example.com\n\nExperience\n• Built software widgets in react and typescript.\n• Optimized frontend pages and resolved bugs. Developed modular React codebases and managed cloud infrastructure using AWS.",
      jobDescription: "We are looking for a Senior Software Engineer with Python and AWS experience. Must be experienced in scaling systems, managing databases, and optimization.",
      instructions: "",
      lengthOption: "Auto-detect"
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    console.log("=== API Response Status ===");
    console.log(response.status);
    console.log("=== API Response Data ===");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Request Failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

main();
