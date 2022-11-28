const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-002",
      prompt: prompt,
      max_tokens: 800,
      temperature: 0.5,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    sendMessage("generating clinical note...");

    const { selectionText } = info;
    const basePromptPrefix = `
        Write me a detailed SOAP note with all four sections for a patient presenting with the following gender, condition, and age.
        `;

    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );

    // const secondPrompt = `
    //       Take the SOAP note below and generate a detailed SOAP note. Don't just list the points. Go deep into each one. Explain why.

    //       Illness: ${selectionText}

    //       SOAP Note: ${baseCompletion.text}

    //       SOAP Note:
    //         `;

    // const secondPromptCompletion = await generate(secondPrompt);

    sendMessage(baseCompletion.text); // if prompt-chaining, change this to secondPromptCompletion
  } catch (error) {
    console.log(error);

    sendMessage(error.toString());
  }
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};

chrome.contextMenus.create({
  id: "context-run",
  title: "Generate clinical note",
  contexts: ["selection"],
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
