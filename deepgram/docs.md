---
title: Getting Started
subtitle: >-
  An introduction to getting transcription data from live streaming audio in
  real time.
slug: docs/live-streaming-audio
---
<Card
    href="https://playground.deepgram.com/?endpoint=listen-streaming&language=en&model=nova-3"
>
  <div class="t-default text-base font-semibold">Deepgram API Playground</div>
  Try this feature out in our API Playground.
</Card>

In this guide, you'll learn how to automatically transcribe live streaming audio in real time using Deepgram's SDKs, which are supported for use with the [Deepgram API](/reference/deepgram-api-overview). (If you prefer not to use a Deepgram SDK, jump to the section [Non-SDK Code Examples](/docs/live-streaming-audio#non-sdk-code-examples).)

<Info>
  Before you start, you'll need to follow the steps in the [Make Your First API Request](/guides/fundamentals/make-your-first-api-request) guide to obtain a Deepgram API key, and configure your environment if you are choosing to use a Deepgram SDK.
</Info>

## SDKs

To transcribe audio from an audio stream using one of Deepgram's SDKs, follow these steps.

### Install the SDK

Open your terminal, navigate to the location on your drive where you want to create your project, and install the Deepgram SDK.

<CodeGroup>
  ```JavaScript
  // Install the Deepgram JS SDK
  // https://github.com/deepgram/deepgram-js-sdk

  // npm install @deepgram/sdk
  ```

  ```Python
  # Install the Deepgram Python SDK
  # https://github.com/deepgram/deepgram-python-sdk

  # pip install deepgram-sdk
  ```

  ```csharp C#
  // Install the Deepgram .NET SDK
  // https://github.com/deepgram/deepgram-dotnet-sdk

  // dotnet add package Deepgram
  ```

  ```Go
  // Install the Deepgram Go SDK
  // https://github.com/deepgram/deepgram-go-sdk

  // go get github.com/deepgram/deepgram-go-sdk
  ```
</CodeGroup>

### Add Dependencies

<CodeGroup>
  ```JavaScript
  // Install cross-fetch: Platform-agnostic Fetch API with typescript support, a simple interface, and optional polyfill.
  // Install dotenv to protect your api key

  // $ npm install cross-fetch dotenv
  ```

  ```Python
  # Install httpx to make http requests

  # pip install httpx
  ```

  ```csharp C#
  // In your .csproj file, add the Package Reference:

  // <ItemGroup>
  //     <PackageReference Include="Deepgram" Version="4.4.0" />
  // </ItemGroup>
  ```

  ```Go
  // Importing the Deepgram Go SDK should pull in all dependencies required
  ```
</CodeGroup>

### Transcribe Audio from a Remote Stream

The following code shows how to transcribe audio from a remote audio stream.

<CodeGroup>
  ```javascript JavaScript
  // Example filename: index.js

  const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
  const fetch = require("cross-fetch");
  const dotenv = require("dotenv");
  dotenv.config();

  // URL for the realtime streaming audio you would like to transcribe
  const url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";

  const live = async () => {
    // STEP 1: Create a Deepgram client using the API key
    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

    // STEP 2: Create a live transcription connection
    const connection = deepgram.listen.live({
      model: "nova-3",
      language: "en-US",
      smart_format: true,
    });

    // STEP 3: Listen for events from the live transcription connection
    connection.on(LiveTranscriptionEvents.Open, () => {
      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("Connection closed.");
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log(data.channel.alternatives[0].transcript);
      });

      connection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log(data);
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error(err);
      });

      // STEP 4: Fetch the audio stream and send it to the live transcription connection
      fetch(url)
        .then((r) => r.body)
        .then((res) => {
          res.on("readable", () => {
            connection.send(res.read());
          });
        });
    });
  };

  live();
  ```

  ```python Python
  # Example filename: main.py

  # For help migrating to the new Python SDK, check out our migration guide:
  # https://github.com/deepgram/deepgram-python-sdk/blob/main/docs/Migrating-v3-to-v5.md

  # Set your Deepgram API key as an environment variable:
  # export DEEPGRAM_API_KEY="your-api-key-here"

  import httpx
  import logging
  import threading

  from deepgram import (
      DeepgramClient,
  )
  from deepgram.core.events import EventType
  from deepgram.extensions.types.sockets import ListenV1SocketClientResponse

  # URL for the realtime streaming audio you would like to transcribe
  URL = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service"

  def main():
      try:
          # use default config
          deepgram: DeepgramClient = DeepgramClient()

          # Create a websocket connection to Deepgram
          with deepgram.listen.v1.connect(model="nova-3") as connection:
              def on_message(message: ListenV1SocketClientResponse) -> None:
                  msg_type = getattr(message, "type", "Unknown")
                  if hasattr(message, 'channel') and hasattr(message.channel, 'alternatives'):
                      sentence = message.channel.alternatives[0].transcript
                      if len(sentence) == 0:
                          return
                      print(message.channel.json(indent=4))

              connection.on(EventType.OPEN, lambda _: print("Connection opened"))
              connection.on(EventType.MESSAGE, on_message)
              connection.on(EventType.CLOSE, lambda _: print("Connection closed"))
              connection.on(EventType.ERROR, lambda error: print(f"Error: {error}"))

              lock_exit = threading.Lock()
              exit = False

              # Define a thread for start_listening with error handling
              def listening_thread():
                  try:
                      connection.start_listening()
                  except Exception as e:
                      print(f"Error in listening thread: {e}")

              # Start listening in a separate thread
              listen_thread = threading.Thread(target=listening_thread)
              listen_thread.start()

              # define a worker thread for HTTP streaming with error handling
              def myThread():
                  try:
                      with httpx.stream("GET", URL) as r:
                          for data in r.iter_bytes():
                              lock_exit.acquire()
                              if exit:
                                  break
                              lock_exit.release()

                              connection.send_media(data)
                  except Exception as e:
                      print(f"Error in HTTP streaming thread: {e}")

              # start the HTTP streaming thread
              myHttp = threading.Thread(target=myThread)
              myHttp.start()

              # signal finished
              input("")
              lock_exit.acquire()
              exit = True
              lock_exit.release()

              # Wait for both threads to close and join with timeout
              myHttp.join(timeout=5.0)
              listen_thread.join(timeout=5.0)

              print("Finished")

      except Exception as e:
          print(f"Could not open socket: {e}")
          return

  if __name__ == "__main__":
      main()
  ```

  ```csharp C#
  // Example filename: Program.cs

  using Deepgram.Models.Listen.v2.WebSocket;

  namespace SampleApp
  {
      class Program
      {
          static async Task Main(string[] args)
          {
              try
              {
                  // Initialize Library with default logging
                  Library.Initialize();

                  // use the client factory with a API Key set with the "DEEPGRAM_API_KEY" environment variable
                  var liveClient = new ListenWebSocketClient();

                  // Subscribe to the EventResponseReceived event
                  await liveClient.Subscribe(new EventHandler<ResultResponse>((sender, e) =>
                  {
                      if (e.Channel.Alternatives[0].Transcript == "")
                      {
                          return;
                      }
                      Console.WriteLine($"Speaker: {e.Channel.Alternatives[0].Transcript}");
                  }));

                  // Start the connection
                  var liveSchema = new LiveSchema()
                  {
                      Model = "nova-3",
                      SmartFormat = true,
                  };
                  bool bConnected = await liveClient.Connect(liveSchema);
                  if (!bConnected)
                  {
                      Console.WriteLine("Failed to connect to the server");
                      return;
                  }

                  // get the webcast data... this is a blocking operation
                  try
                  {
                      var url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service";
                      using (HttpClient client = new HttpClient())
                      {
                          using (Stream receiveStream = await client.GetStreamAsync(url))
                          {
                              while (liveClient.IsConnected())
                              {
                                  byte[] buffer = new byte[2048];
                                  await receiveStream.ReadAsync(buffer, 0, buffer.Length);
                                  liveClient.Send(buffer);
                              }
                          }
                      }
                  }
                  catch (Exception e)
                  {
                      Console.WriteLine(e.Message);
                  }

                  // Stop the connection
                  await liveClient.Stop();

                  // Teardown Library
                  Library.Terminate();
              }
              catch (Exception e)
              {
                  Console.WriteLine(e.Message);
              }
          }
      }
  }
  ```

  ```go Go
  // Example filename: main.go
  package main

  import (
  	"bufio"
  	"context"
  	"fmt"
  	"net/http"
  	"os"
  	"reflect"

  	interfaces "github.com/deepgram/deepgram-go-sdk/pkg/client/interfaces"
  	client "github.com/deepgram/deepgram-go-sdk/pkg/client/live"
  )

  const (
  	STREAM_URL = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service"
  )

  func main() {
  	// STEP 1: init Deepgram client library
  	client.InitWithDefault()

  	// STEP 2: define context to manage the lifecycle of the request
  	ctx := context.Background()

  	// STEP 3: define options for the request
  	transcriptOptions := interfaces.LiveTranscriptionOptions{
  		Model:       "nova-3",
  		Language:    "en-US",
  		SmartFormat: true,
  	}

  	// STEP 4: create a Deepgram client using default settings
  	// NOTE: you can set your API KEY in your bash profile by typing the following line in your shell:
  	// export DEEPGRAM_API_KEY = "YOUR_DEEPGRAM_API_KEY"
  	dgClient, err := client.NewForDemo(ctx, &transcriptOptions)
  	if err != nil {
  		fmt.Println("ERROR creating LiveTranscription connection:", err)
  		return
  	}

  	// STEP 5: connect to the Deepgram service
  	bConnected := dgClient.Connect()
  	if !bConnected {
  		fmt.Println("Client.Connect failed")
  		os.Exit(1)
  	}

  	// STEP 6: create an HTTP client to stream audio data
  	httpClient := new(http.Client)

  	// STEP 7: create an HTTP stream
  	res, err := httpClient.Get(STREAM_URL)
  	if err != nil {
  		fmt.Printf("httpClient.Get failed. Err: %v\n", err)
  		return
  	}

  	fmt.Printf("Stream is up and running %s\n", reflect.TypeOf(res))

  	go func() {
  		// STEP 8: feed the HTTP stream to the Deepgram client (this is a blocking call)
  		dgClient.Stream(bufio.NewReader(res.Body))
  	}()

  	// STEP 9: wait for user to exit
  	fmt.Print("Press ENTER to exit!\n\n")
  	input := bufio.NewScanner(os.Stdin)
  	input.Scan()

  	// STEP 10: close HTTP stream
  	res.Body.Close()

  	// STEP 11: close the Deepgram client
  	dgClient.Stop()

  	fmt.Printf("Program exiting...\n")
  }
  ```
</CodeGroup>

<Info>
  The above example includes the parameter `model=nova-3`, which tells the API to use Deepgram's latest model. Removing this parameter will result in the API using the default model, which is currently `model=base`.

  It also includes Deepgram's [Smart Formatting](/docs/smart-format) feature, `smart_format=true`. This will format currency amounts, phone numbers, email addresses, and more for enhanced transcript readability.
</Info>

## Non-SDK Code Examples

If you would like to try out making a Deepgram speech-to-text request in a specific language (but not using Deepgram's SDKs), we offer a library of code-samples in this [Github repo](https://github.com/deepgram-devs/code-samples). However, we recommend first trying out our SDKs.

## Results

In order to see the results from Deepgram, you must run the application. Run your application from the terminal. Your transcripts will appear in your shell.

<CodeGroup>
  ```javascript JavaScript
  # Run your application using the file you created in the previous step
  # Example: node index.js

  node YOUR_FILE_NAME.js
  ```

  ```shell Python
  # Run your application using the file you created in the previous step
  # Example: python main.py

  python YOUR_FILE_NAME.py
  ```

  ```shell C#
  # Run your application using the file you created in the previous step
  # Example: dotnet run Program.cs

  dotnet run YOUR_FILE_NAME.cs
  ```

  ```shell Go
  # Run your application using the file you created in the previous step
  # Example: go run main.go

  go run YOUR_FILE_NAME.go
  ```
</CodeGroup>

<Warning>
  Deepgram does not store transcripts, so the Deepgram API response is the only opportunity to retrieve the transcript. Make sure to save output or [return transcriptions to a callback URL for custom processing](/docs/callback/).
</Warning>

### Analyze the Response

The responses that are returned will look similar to this:

<CodeGroup>
  ```json JSON
  {
    "type": "Results",
    "channel_index": [
      0,
      1
    ],
    "duration": 1.98,
    "start": 5.99,
    "is_final": true,
    "speech_final": true,
    "channel": {
      "alternatives": [
        {
          "transcript": "Tell me more about this.",
          "confidence": 0.99964225,
          "words": [
            {
              "word": "tell",
              "start": 6.0699997,
              "end": 6.3499994,
              "confidence": 0.99782443,
              "punctuated_word": "Tell"
            },
            {
              "word": "me",
              "start": 6.3499994,
              "end": 6.6299996,
              "confidence": 0.9998324,
              "punctuated_word": "me"
            },
            {
              "word": "more",
              "start": 6.6299996,
              "end": 6.79,
              "confidence": 0.9995466,
              "punctuated_word": "more"
            },
            {
              "word": "about",
              "start": 6.79,
              "end": 7.0299997,
              "confidence": 0.99984455,
              "punctuated_word": "about"
            },
            {
              "word": "this",
              "start": 7.0299997,
              "end": 7.2699995,
              "confidence": 0.99964225,
              "punctuated_word": "this"
            }
          ]
        }
      ]
    },
    "metadata": {
      "request_id": "52cc0efe-fa77-4aa7-b79c-0dda09de2f14",
      "model_info": {
        "name": "2-general-nova",
        "version": "2024-01-18.26916",
        "arch": "nova-2"
      },
      "model_uuid": "c0d1a568-ce81-4fea-97e7-bd45cb1fdf3c"
    },
    "from_finalize": false
  }
  ```
</CodeGroup>

In this default response, we see:

* `transcript`: the transcript for the audio segment being processed.
* `confidence`: a floating point value between 0 and 1 that indicates overall transcript reliability. Larger values indicate higher confidence.
* `words`: an object containing each `word` in the transcript, along with its `start` time and `end` time (in seconds) from the beginning of the audio stream, and a `confidence` value.
  * Because we passed the `smart_format: true` option to the `transcription.prerecorded` method, each word object also includes its `punctuated_word` value, which contains the transformed word after punctuation and capitalization are applied.
* `speech_final`: tells us this segment of speech naturally ended at this point. By default, Deepgram live streaming looks for any deviation in the natural flow of speech and returns a finalized response at these places. To learn more about this feature, see [Endpointing](/docs/endpointing/).
* `is_final`: If this says `false`, it is indicating that Deepgram will continue waiting to see if more data will improve its predictions. Deepgram live streaming can return a series of interim transcripts followed by a final transcript. To learn more, see [Interim Results](/docs/interim-results/).

<Info>
  Endpointing can be used with Deepgram's [Interim Results](/docs/interim-results/) feature. To compare and contrast these features, and to explore best practices for using them together, see [Using Endpointing and Interim Results with Live Streaming Audio](/docs/understand-endpointing-interim-results/).
</Info>

If your scenario requires you to keep the connection alive even while data is not being sent to Deepgram, you can send periodic KeepAlive messages to essentially "pause" the connection without closing it. To learn more, see [KeepAlive](/docs/audio-keep-alive).

## What's Next?

Now that you've gotten transcripts for streaming audio, enhance your knowledge by exploring the following areas. You can also check out our [Live Streaming API Reference](/reference/speech-to-text/listen-streaming) for a list of all possible parameters.

### Read the Feature Guides

Deepgram's features help you to customize your transcripts.

* [Language](/docs/language): Learn how to transcribe audio in other languages.
* [Feature Overview](/docs/stt-streaming-feature-overview): Review the list of features available for streaming speech-to-text. Then, dive into individual guides for more details.

### Tips and tricks

* [End of speech detection](/docs/understanding-end-of-speech-detection) - Learn how to pinpoint end of speech post-speaking more effectively.
* [Using interim results](/docs/using-interim-results) - Learn how to use preliminary results provided during the streaming process which can help with speech detection.
* [Measuring streaming latency](/docs/measuring-streaming-latency) - Learn how to measure latency in real-time streaming of audio.

### Add Your Audio

* Ready to connect Deepgram to your own audio source? Start by reviewing [how to determine your audio format](/docs/determining-your-audio-format-for-live-streaming-audio/) and format your API request accordingly.
* Then, check out our [Live Streaming Starter Kit](/docs/getting-started-with-the-streaming-test-suite). It's the perfect "102" introduction to integrating your own audio.

### Explore Use Cases

* Learn about the different ways you can use Deepgram products to help you meet your business objectives. [Explore Deepgram's use cases](/docs/transcribe-recorded-calls-with-twilio).

### Transcribe Pre-recorded Audio

* Now that you know how to transcribe streaming audio, check out how you can use Deepgram to transcribe pre-recorded audio. To learn more, see [Getting Started with Pre-recorded Audio](/docs/pre-recorded-audio).

***
---
title: Feature Overview
subtitle: >-
  Below is a matrix of Deepgram's Speech-to-Text Streaming features. Please
  refer to the corresponding documentation for more details.
slug: docs/stt-streaming-feature-overview
---


<Info>
  To learn how to get up and running with Streaming Speech-to-Text, read the [Streaming Speech-to-Text](/docs/live-streaming-audio) getting started guide.
</Info>

## Model Selection

| Feature | Language(s) |
|---------|-------------|
| [Model](/docs/model) | [All available](/docs/models-languages-overview) |
| [Language](/docs/language) | [All available](/docs/models-languages-overview) |
| [Multilingual Codeswitching](/docs/multilingual-code-switching) | [Specific languages only](/docs/models-languages-overview#nova-3) |
| [Version](/docs/version) | [All available](/docs/models-languages-overview) |

## Formatting

| Feature | Language(s) |
|---------|-------------|
| [Smart Formatting](/docs/smart-format) | [All available](/docs/models-languages-overview) |
| [Speaker Diarization](/docs/diarization) | [All available](/docs/models-languages-overview) |
| [Numerals](/docs/numerals) | [Specific languages only](/docs/models-languages-overview) |
| [Punctuation](/docs/punctuation) | [All available](/docs/models-languages-overview) |
| [Profanity Filter](/docs/profanity-filter) | [Specific languages only](/docs/models-languages-overview) |
| [Redaction](/docs/redaction) | [Specific languages only](/docs/models-languages-overview) |

## Custom Vocabulary

| Feature | Language(s) |
|---------|-------------|
| [Find and Replace](/docs/find-and-replace) | [All available](/docs/models-languages-overview) |
| [Keyterm Prompting](/docs/keyterm) <small>(Also see [Legacy Keywords](/docs/keywords))</small> | [All available](/docs/models-languages-overview) |
| [Search](/docs/search) | [All available](/docs/models-languages-overview) |

## Intelligence

| Feature | Model Support | Language(s) |
|---------|---------------|-------------|
| [Entity Detection](/docs/detect-entities) | Nova, Nova-2, Nova-3, Enhanced | [English (all available regions)](/docs/models-languages-overview) |

## Media Input Settings

| Feature | Language(s) |
|---------|-------------|
| [Multichannel](/docs/multichannel) | [All available](/docs/models-languages-overview) |
| [Sample rate](/docs/sample-rate) | [All available](/docs/models-languages-overview) |
| [Channels](/docs/channels) | [All available](/docs/models-languages-overview) |
| [Encoding](/docs/encoding) | [All available](/docs/models-languages-overview) |

## Results Processing

| Feature | Language(s) |
|---------|-------------|
| [Callback](/docs/callback) | [All available](/docs/models-languages-overview) |
| [Endpointing](/docs/endpointing) | [All available](/docs/models-languages-overview) |
| [Utterance End](/docs/utterance-end) | [All available](/docs/models-languages-overview) |
| [Speech Started](/docs/speech-started) | [All available](/docs/models-languages-overview) |
| [Interim results](/docs/interim-results) | [All available](/docs/models-languages-overview) |
| [Tagging](/docs/stt-tagging) | [All available](/docs/models-languages-overview) |
| [Extra Metadata](/docs/extra-metadata) | [All available](/docs/models-languages-overview) |

## Control Messages

| Feature |
|---------|
| [Close Stream](/docs/close-stream) |
| [Finalize](/docs/finalize) |
| [Keep Alive](/docs/audio-keep-alive) |

## Rate Limits

<Info>
  For information on Deepgram's Concurrency Rate Limits, refer to our [API Rate Limits Documentation](/reference/api-rate-limits).
</Info>

## Deepgram Self-Hosted

<Info>
  Having challenges with performance and latency? Check out Deepgram's [Self-Hosted Solution](/docs/self-hosted-introduction) to get the benefits of running your own hosted instance of Deepgram.
</Info>

***
---
title: Live Streaming Starter Kit
subtitle: >-
  Deepgram's Live Streaming Starter Kit will take you step by step through the
  process of getting up and running with Deepgram's live streaming API.
slug: docs/getting-started-with-the-streaming-test-suite
---


If you're looking to get started with Deepgram's audio streaming capabilities, this is the perfect place to begin. The starter kit provides sample code that allows you to easily stream basic audio to Deepgram, ensuring that you have the necessary foundation to build for your unique use case.

![image of terminal showing the streaming test suite transcribing the Preamble](file:6a620921-38f0-40ea-8623-c26178f80f8c)

Once you've tested out the basics of streaming audio to Deepgram, you'll move on to using an included mock server for testing. This allows you to focus on getting your audio and client code right. Once you're confident that your audio stream is configured correctly and you're streaming the audio you expect, you can easily swap to sending that audio to Deepgram's service.

Before diving into writing code from scratch, we highly recommend running through the steps in our starter kit at least once to ensure that you can stream sample audio to Deepgram successfully. This will help you avoid many potential issues and streamline the integration process for sending your own audio to our system.

The starter kit includes many ways to help diagnose problems including more details on errors as well as steps to fix the errors you encounter.

# Set Up

## Prerequisites

You must have:

* Python >= 3.6+
* [portaudio](http://portaudio.com/), if you plan to stream audio from your microphone
* A valid Deepgram API key (you can create one in our [Console](https://console.deepgram.com/signup?jump=keys))

## Installation

1. Clone the [Live Streaming Starter Kit](https://github.com/deepgram/streaming-test-suite/) repository
2. Install [portaudio](http://portaudio.com/)
3. `pip install -r requirements.txt`

<Info>
  <h2> Installing PortAudio </h2>
  If you use Homebrew or Conda, we recommend installing PortAudio with `brew install portaudio` or `conda install portaudio`.

  Otherwise, you can download a zip file from [portaudio.com](http://portaudio.com/), unzip it, and then consult [PortAudio's docs](http://www.portaudio.com/docs/v19-doxydocs/pages.html) as a reference for how to build the package on your operating system. For Linux and MacOS, the build command within the top-level `portaudio/` directory is `./configure && make`.

  PortAudio is known to have compatibility issues on Windows. However, this dependency is only required if you plan to stream audio from your microphone. If you run into issues installing PortAudio, you can still complete the other tasks outlined in this guide.
</Info>

# Streaming a Local Source

The first step in getting started with Deepgram's audio streaming capabilities is to learn how to stream a local audio source to Deepgram. This task allows you to learn the basic concepts of how Deepgram's API works without worrying about complexities that arise with other audio sources. Additionally, it ensures that you can receive results from Deepgram in your development environment.

The starter kit provides sample code that facilitates this process. Before building your own integration, we recommend running this code at least once to make sure that you can stream audio to Deepgram successfully.

<Warning>
  If you're already confident you can stream audio to Deepgram and receive transcriptions, you can skip to [3. Streaming Your Audio](#3-streaming-other-audio).
</Warning>

## Stream a File

While streaming a file isn't our recommended way to use Deepgram's real-time transcription service (we suggest our [pre-recorded API](/docs/pre-recorded-audio) for that), it's a quick and easy way to make sure your API key and network are functioning correctly.

Just run the following command:

`python test_suite.py -k YOUR_DEEPGRAM_API_KEY`

You may need to use the command `python3` instead.

<Warning>
  Make sure to replace `YOUR_DEEPGRAM_API_KEY` with an API key generated from our [Console](https://console.deepgram.com/).
</Warning>

This will stream the included file, `preamble.wav`, to Deepgram and print out transcripts to your terminal.

You can also stream your own WAV file by running:

`python test_suite.py -k YOUR_DEEPGRAM_API_KEY -i /path/to/audio.wav`

To check out how this functionality is implemented, look at the conditional `elif method == 'wav'` in our `sender` function.

<Info>
  Self-hosting a Deepgram deployment? You can provide your custom URL to the test suite with the `--host` argument.
</Info>

## Stream Your Microphone

The starter kit also has the ability to send audio from your microphone to Deepgram for transcription.

First, make sure [pyaudio](https://pypi.org/project/PyAudio/) and its [portaudio](http://portaudio.com/) dependency are installed, and you have a microphone connected to your computer. Then, run:

`python test_suite.py -k YOUR_DEEPGRAM_API_KEY -i mic`

## Additional Options

The following arguments can be appended to any test suite command.

### Parameters

`--model/-m`: Specify a Deepgram model. Example: `--model phonecall`. Defaults to `general`.


### Timestamps

`--timestamps/-ts`: Opt-in to printing start and end timestamps in seconds for each streaming response. Example: `--timestamps`

Sample output line with timestamps:

```
In order to form a more perfect union, [2.5 - 4.26]
```

### Subtitle Generation

In addition to printing transcripts to the terminal, the test suite can also wrap Deepgram's responses in two common subtitle formats, SRT or VTT.

To generate SRT or VTT files, add the `-f/--format` parameter when running the test suite:

`python test_suite.py -k YOUR_DEEPGRAM_API_KEY [-i mic|/path/to/audio.wav] [-f text|vtt|srt]`

This parameter defaults to `text`, which outputs responses to your terminal.

***

If you were able to successfully stream local audio and receive a transcript, you're ready to move on to the next step!

# Streaming a Remote Source

The next step in getting started with Deepgram's audio streaming capabilities is to learn how to stream a remote file to Deepgram. This task introduces slightly more complexity and requires managing multiple asynchronous remote sources—one for audio input to Deepgram, one for Deepgram's transcription output.

## Stream a URL

Make sure you have the URL for direct audio stream to test with. A good way of testing this is to open the URL in a browser—you should see just the built-in browser audio player without an accompanying web page.

Here are two URLs for you to try:

* BBC World Service: [http://stream.live.vc.bbcmedia.co.uk/bbc\_world\_service](http://stream.live.vc.bbcmedia.co.uk/bbc_world_service)
* France Inter: [https://direct.franceinter.fr/live/franceinter-midfi.mp3](https://direct.franceinter.fr/live/franceinter-midfi.mp3)

If you use the French channel, be sure to add `language=fr` to your Deepgram URL.

Then, run the test suite to see the results:

`python test_suite.py -k YOUR_DEEPGRAM_API_KEY -i http://stream.live.vc.bbcmedia.co.uk/bbc_world_service`

To check out how this functionality is implemented, look at the conditional `elif method == url` in our `sender` function. We use the `aiohttp` library to make an asynchronous request and open a session, then send content to Deepgram.

# Streaming Other Audio

Now that you've validated you can stream WAV files and URLs to Deepgram, it's time to start the process of integrating other audio sources, so you can build something with Deepgram that's tailored to your business needs. To do this, we'll start by taking a step back…and removing Deepgram from the picture!

Let's set the `test_suite.py` file aside for the moment. In addition to that file, the test suite also comes with a mock server and client: `server.py` and `client.py`. These are intended to create the simplest possible environment to test your custom audio.

The mock server exposes a similar interface to Deepgram's streaming service. It accepts websocket connections that specify an encoding, sample rate, and number of channels; and it expects a stream of raw audio. However, it doesn't transcribe that audio. All it does is send back messages confirming how much audio data has been received, and once the client closes the stream, it saves all sent audio to a file.

Using the mock server for testing allows you to focus on getting your audio and client code right. Once you're confident that your audio stream is configured correctly and you're streaming the audio you expect, you can easily swap to sending that audio to Deepgram's service.

## Run the Mock Server

Start by running the mock server:

`python server.py`

Then, open another terminal window and prepare to run the mock client.

The mock client accepts these parameters:

`python client.py [-i INPUT] [-e ENCODING] [-s SAMPLE_RATE] [-c CHANNELS]`

The starter kit comes with a raw audio file, `preamble.raw` , that you can use to test streaming to the mock server. You can stream `preamble.raw` with the mock client like so:

`python client.py -i preamble.raw -e linear16 -s 8000 -c 1`

When you run the mock client, you should see output confirming that the mock server has begun to receive your audio.

![](file:804c641b-819d-4968-99a9-aa01d9b795c4)

For a list of valid encodings, see [our endcoding documentation](/docs/encoding/).

## Validate Your Audio

At the end of an audio stream, the mock server saves all audio data that was sent in a RAW file. It will return the filename to you at the end of the stream.

![image of terminal showing message that websocket is receiving data](file:3055e517-ddaa-4ab2-8761-893eab10f1c6)

You need to ensure the audio the server received is the audio you intended to send. To validate this, open this file in a program like Audacity (specifying necessary parameters like the encoding and sample rate) and try to play it back. You should be able to listen to your audio and verify it's correct.

## Stream to Deepgram

Once you verify your audio is correct, you can try streaming that audio to Deepgram. To do so, simply swap the websocket URL in `client.py` to point to Deepgram—the correct URL is left in a comment for you.

![image of terminal showing lines to edit to connect to Deepgram](file:7cd3f7f5-25d0-4a10-b82c-95ba4a45cc15)

Don't forget add your DG API key to the websocket headers where it says `YOUR_DG_API_KEY`.

![](file:6a8cdd6c-24bd-460b-b6c6-fc087d09c90c)

If you were able to stream to the mock server, and have validated your audio sounds correct, you should be able to seamlessly start receiving transcriptions from Deepgram.

# Wrap-Up

By following the starter kit steps, you've built your knowledge of working with websockets, audio, and Deepgram's system. We hope this guide has enabled you to build your own custom audio integrations with confidence.

***
---
title: Audio Keep Alive
subtitle: Send keep alive messages while streaming audio to keep the connection open.
slug: docs/audio-keep-alive
---

<div class="flex flex-row gap-2">
  <span class="dg-badge"><span><Icon icon="waveform-lines" /> Streaming:Nova</span></span>
</div>

Use the `KeepAlive` message to keep your WebSocket connection open during periods of silence, preventing timeouts and optimizing costs.

## Purpose

 Send a `KeepAlive` message every 3-5 seconds to prevent the 10-second timeout that triggers a `NET-0001` error and closes the connection. Ensure the message is sent as a text WebSocket frame—sending it as binary may result in incorrect handling and potential connection issues.

## Example Payloads

To send the `KeepAlive` message, send the following JSON message to the server:

<CodeGroup>
  ```json JSON
  {
    "type": "KeepAlive"
  }
  ```
</CodeGroup>

The server will not send a response back when you send a `KeepAlive` message. If no audio data or `KeepAlive` messages are sent within a 10-second window, the connection will close with a `NET-0001` error.

## Language Specific Implementations

Below are code examples to help you get started using `KeepAlive`.

### Sending a `KeepAlive` message in JSON Format

Construct a JSON message containing the `KeepAlive` type and send it over the WebSocket connection in each respective language.

<CodeGroup>
  ```javascript JavaScript
  const WebSocket = require("ws");

  // Assuming 'headers' is already defined for authorization
  const ws = new WebSocket("wss://api.deepgram.com/v1/listen", { headers });

  // Assuming 'ws' is the WebSocket connection object
  const keepAliveMsg = JSON.stringify({ type: "KeepAlive" });
  ws.send(keepAliveMsg);
  ```

  ```python Python
  import json
  import websocket

  # Assuming 'headers' is already defined for authorization
  ws = websocket.create_connection("wss://api.deepgram.com/v1/listen", header=headers)

  # Assuming 'ws' is the WebSocket connection object
  keep_alive_msg = json.dumps({"type": "KeepAlive"})
  ws.send(keep_alive_msg)
  ```

  ```go Go
  package main

  import (
      "encoding/json"
      "log"
      "net/http"
      "github.com/gorilla/websocket"
  )

  func main() {
      // Define headers for authorization
      headers := http.Header{}

    	// Assuming headers are set here for authorization
      conn, _, err := websocket.DefaultDialer.Dial("wss://api.deepgram.com/v1/listen", headers)
      if err != nil {
          log.Fatal("Error connecting to WebSocket:", err)
      }
      defer conn.Close()

      // Construct KeepAlive message
      keepAliveMsg := map[string]string{"type": "KeepAlive"}
      jsonMsg, err := json.Marshal(keepAliveMsg)
      if err != nil {
          log.Fatal("Error encoding JSON:", err)
      }

      // Send KeepAlive message
      err = conn.WriteMessage(websocket.TextMessage, jsonMsg)
      if err != nil {
          log.Fatal("Error sending KeepAlive message:", err)
      }
  }
  ```

  ```csharp C#
  using System;
  using System.Net.WebSockets;
  using System.Text;
  using System.Threading;
  using System.Threading.Tasks;

  class Program
  {
      static async Task Main(string[] args)
      {
          // Set up the WebSocket URL and headers
          Uri uri = new Uri("wss://api.deepgram.com/v1/listen");

          string apiKey = "DEEPGRAM_API_KEY";

          // Create a new client WebSocket instance
          using (ClientWebSocket ws = new ClientWebSocket())
          {
              // Set the authorization header
              ws.Options.SetRequestHeader("Authorization", "Token " + apiKey);

              // Connect to the WebSocket server
              await ws.ConnectAsync(uri, CancellationToken.None);

              // Construct the KeepAlive message
              string keepAliveMsg = "{\"type\": \"KeepAlive\"}";

              // Convert the KeepAlive message to a byte array
              byte[] keepAliveBytes = Encoding.UTF8.GetBytes(keepAliveMsg);

              // Send the KeepAlive message asynchronously
              await ws.SendAsync(new ArraySegment<byte>(keepAliveBytes), WebSocketMessageType.Text, true, CancellationToken.None);
          }
      }
  }
  ```
</CodeGroup>

### Streaming Examples

Make a streaming request and use `KeepAlive` to keep the connection open.

<CodeGroup>
  ```javascript JavaScript
  const WebSocket = require("ws");

  const authToken = "DEEPGRAM_API_KEY"; // Replace 'DEEPGRAM_API_KEY' with your actual authorization token
  const headers = {
    Authorization: `Token ${authToken}`,
  };

  // Initialize WebSocket connection
  const ws = new WebSocket("wss://api.deepgram.com/v1/listen", { headers });

  // Handle WebSocket connection open event
  ws.on("open", function open() {
    console.log("WebSocket connection established.");

    // Send audio data (replace this with your audio streaming logic)
    // Example: Read audio from a microphone and send it over the WebSocket
    // For demonstration purposes, we're just sending a KeepAlive message

    setInterval(() => {
      const keepAliveMsg = JSON.stringify({ type: "KeepAlive" });
      ws.send(keepAliveMsg);
      console.log("Sent KeepAlive message");
    }, 3000); // Sending KeepAlive messages every 3 seconds
  });

  // Handle WebSocket message event
  ws.on("message", function incoming(data) {
    console.log("Received:", data);
    // Handle received data (transcription results, errors, etc.)
  });

  // Handle WebSocket close event
  ws.on("close", function close() {
    console.log("WebSocket connection closed.");
  });

  // Handle WebSocket error event
  ws.on("error", function error(err) {
    console.error("WebSocket error:", err.message);
  });

  // Gracefully close the WebSocket connection when done
  function closeWebSocket() {
    const closeMsg = JSON.stringify({ type: "CloseStream" });
    ws.send(closeMsg);
  }

  // Call closeWebSocket function when you're finished streaming audio
  // For example, when user stops recording or when the application exits
  // closeWebSocket();
  ```

  ```python Python
  import websocket
  import json
  import time
  import threading

  auth_token = "DEEPGRAM_API_KEY"  # Replace 'DEEPGRAM_API_KEY' with your actual authorization token
  headers = {
      "Authorization": f"Token {auth_token}"
  }

  # WebSocket URL
  ws_url = "wss://api.deepgram.com/v1/listen"

  # Define the WebSocket on_open function
  def on_open(ws):
      print("WebSocket connection established.")
      # Send KeepAlive messages every 3 seconds
      def keep_alive():
          while True:
              keep_alive_msg = json.dumps({"type": "KeepAlive"})
              ws.send(keep_alive_msg)
              print("Sent KeepAlive message")
              time.sleep(3)
      # Start a thread for sending KeepAlive messages
      keep_alive_thread = threading.Thread(target=keep_alive)
      keep_alive_thread.daemon = True
      keep_alive_thread.start()

  # Define the WebSocket on_message function
  def on_message(ws, message):
      print("Received:", message)
      # Handle received data (transcription results, errors, etc.)

  # Define the WebSocket on_close function
  def on_close(ws):
      print("WebSocket connection closed.")

  # Define the WebSocket on_error function
  def on_error(ws, error):
      print("WebSocket error:", error)

  # Create WebSocket connection
  ws = websocket.WebSocketApp(ws_url,
                              on_open=on_open,
                              on_message=on_message,
                              on_close=on_close,
                              on_error=on_error,
                              header=headers)

  # Run the WebSocket
  ws.run_forever()
  ```
</CodeGroup>

## Using Deepgram SDKs

Deepgram's SDKs make it easier to build with Deepgram in your preferred language.
For more information on using Deepgram SDKs, refer to the SDKs documentation in the GitHub Repository.

* [JS SDK](https://github.com/deepgram/deepgram-js-sdk)
* [Python SDK](https://github.com/deepgram/deepgram-python-sdk)
* [Go SDK](https://github.com/deepgram/deepgram-go-sdk)
* [.NET SDK](https://github.com/deepgram/deepgram-dotnet-sdk)

<CodeGroup>
  ```javascript JavaScript
  const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

  const live = async () => {
    const deepgram = createClient("DEEPGRAM_API_KEY");
    let connection;
    let keepAlive;

    const setupDeepgram = () => {
      connection = deepgram.listen.live({
        model: "nova-3",
        utterance_end_ms: 1500,
        interim_results: true,
      });

      if (keepAlive) clearInterval(keepAlive);
      keepAlive = setInterval(() => {
        console.log("KeepAlive sent.");
        connection.keepAlive();
      }, 3000); // Sending KeepAlive messages every 3 seconds

      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log("Connection opened.");
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log("Connection closed.");
        clearInterval(keepAlive);
      });

      connection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log(data);
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log(data.channel);
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
        console.log(data);
      });

      connection.on(LiveTranscriptionEvents.SpeechStarted, (data) => {
        console.log(data);
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error(err);
      });
    };

    setupDeepgram();
  };

  live();
  ```

  ```python Python
  # For help migrating to the new Python SDK, check out our migration guide:
  # https://github.com/deepgram/deepgram-python-sdk/blob/main/docs/Migrating-v3-to-v5.md

  import os
  from deepgram import DeepgramClient
  from deepgram.core.events import EventType

  API_KEY = os.getenv("DEEPGRAM_API_KEY")

  def main():
      try:
          deepgram = DeepgramClient(
              api_key=API_KEY,
              config={"keepalive": "true"} # Comment this out to see the effect of not using keepalive
          )

          with deepgram.listen.websocket.v('1').stream(
              model="nova-3",
              language="en-US",
              smart_format=True,
          ) as dg_connection:

              def on_message(result):
                  if hasattr(result, 'channel') and result.channel.alternatives:
                      sentence = result.channel.alternatives[0].transcript
                      if len(sentence) == 0:
                          return
                      print(f"speaker: {sentence}")

              def on_metadata(result):
                  print(f"\n\n{result}\n\n")

              def on_error(error):
                  print(f"\n\n{error}\n\n")

              dg_connection.on(EventType.MESSAGE, on_message)
              dg_connection.on(EventType.METADATA, on_metadata)
              dg_connection.on(EventType.ERROR, on_error)

              dg_connection.start_listening()

      except Exception as e:
          print(f"Could not open socket: {e}")

  if __name__ == "__main__":
      main()
  ```

  ```go Go
  package main

  import (
  	"bufio"
  	"context"
  	"fmt"
  	"os"

  	interfaces "github.com/deepgram/deepgram-go-sdk/pkg/client/interfaces"
  	client "github.com/deepgram/deepgram-go-sdk/pkg/client/live"
  )

  func main() {
  	// init library
  	client.InitWithDefault()

  	// Go context
  	ctx := context.Background()

  	// set the Transcription options
  	tOptions := interfaces.LiveTranscriptionOptions{
  		Model="nova-3",
      Language:  "en-US",
  		Punctuate: true,
  	}

  	// create a Deepgram client
  	cOptions := interfaces.ClientOptions{
  		EnableKeepAlive: true, // Comment this out to see the effect of not using keepalive
  	}

  	// use the default callback handler which just dumps all messages to the screen
  	dgClient, err := client.New(ctx, "", cOptions, tOptions, nil)
  	if err != nil {
  		fmt.Println("ERROR creating LiveClient connection:", err)
  		return
  	}

  	// connect the websocket to Deepgram
  	wsconn := dgClient.Connect()
  	if wsconn == nil {
  		fmt.Println("Client.Connect failed")
  		os.Exit(1)
  	}

  	// wait for user input to exit
  	fmt.Printf("This demonstrates using KeepAlives. Press ENTER to exit...\n")
  	input := bufio.NewScanner(os.Stdin)
  	input.Scan()

  	// close client
  	dgClient.Stop()

  	fmt.Printf("Program exiting...\n")
  }
  ```
</CodeGroup>

## Word Timings

Word timings in streaming transcription results are based on the audio stream itself, not the lifetime of the WebSocket connection. If you send KeepAlive messages without any audio payloads for a period of time, then resume sending audio, the timestamps will continue from where the audio left off—not from when the KeepAlive messages were sent.

Here is an example timeline demonstrating the behavior.

| Event                                                            | Wall Time  | Word Timing Range on Results Response |
| ---------------------------------------------------------------- | ---------- | ------------------------------------- |
| Websocket opened, begin sending audio payloads                   | 0 seconds  | 0 seconds                             |
| Results received                                                 | 5 seconds  | 0-5 seconds                           |
| Results received                                                 | 10 seconds | 5-10 seconds                          |
| Pause sending audio payloads, while sending `KeepAlive` messages | 10 seconds | *n/a*                                 |
| Resume sending audio payloads                                    | 30 seconds | *n/a*                                 |
| Results received                                                 | 35 seconds | 10-15 seconds                         |

***
---
title: Finalize
subtitle: Send a Finalize message to flush the WebSocket stream.
slug: docs/finalize
---

<div class="flex flex-row gap-2">
  <span class="dg-badge"><span><Icon icon="waveform-lines" /> Streaming:Nova</span></span>
</div>

Use the `Finalize` message to flush the WebSocket stream. This forces the server to immediately process any unprocessed audio data and return the final transcription results.

## Purpose

In real-time audio processing, there are scenarios where you may need to force the server to process (*or flush*) all unprocessed audio data immediately. Deepgram supports a `Finalize` message to handle such situations, ensuring that interim results are treated as final.

## Example Payloads

To send the `Finalize` message, you need to send the following JSON message to the server:

<CodeGroup>
  ```json JSON
  {
    "type": "Finalize"
  }
  ```
</CodeGroup>

You can optionally specify a `channel` field to finalize a specific channel. If the `channel` field is omitted, all channels in the audio will be finalized. Note that channel indexing starts at 0, so to finalize only the *first* channel you need to send:

<CodeGroup>
  ```json JSON
  {
    "type": "Finalize",
     "channel": 0
  }
  ```
</CodeGroup>

Upon receiving the Finalize message, the server will process all remaining audio data and return the final results. You may receive a response with the `from_finalize` attribute set to `true`, indicating that the finalization process is complete. This response typically occurs when there is a noticeable amount of audio buffered in the server.

If you specified a `channel` to be finalized, use the response's `channel_index` field to check which channel was finalized.

<CodeGroup>
  ```json JSON
  {
    "from_finalize": true
  }
  ```
</CodeGroup>

<Info>
  In most cases, you will receive this response, but it is not guaranteed if there is no significant amount of audio data to process.
</Info>

## Language-Specific Implementations

Below are code examples to help you get started using `Finalize`.

### Sending a `Finalize` message in JSON Format

These snippets demonstrate how to construct a JSON message containing the "Finalize" type and send it over the WebSocket connection in each respective language.

<CodeGroup>
  ```javascript JavaScript
  const WebSocket = require("ws");

  // Assuming 'headers' is already defined for authorization
  const ws = new WebSocket("wss://api.deepgram.com/v1/listen", { headers });

  ws.on('open', function open() {
    // Construct Finalize message
    const finalizeMsg = JSON.stringify({ type: "Finalize" });

    // Send Finalize message
    ws.send(finalizeMsg);
  });
  ```

  ```python Python
  import json
  import websocket

  # Assuming 'headers' is already defined for authorization
  ws = websocket.create_connection("wss://api.deepgram.com/v1/listen", header=headers)

  # Construct Finalize message
  finalize_msg = json.dumps({"type": "Finalize"})

  # Send Finalize message
  ws.send(finalize_msg)
  ```

  ```go Go
  package main

  import (
      "encoding/json"
      "log"
      "net/http"
      "github.com/gorilla/websocket"
  )

  func main() {
      // Define headers for authorization
      headers := http.Header{}

      // Assuming headers are set here for authorization
      conn, _, err := websocket.DefaultDialer.Dial("wss://api.deepgram.com/v1/listen", headers)
      if err != nil {
          log.Fatal("Error connecting to WebSocket:", err)
      }
      defer conn.Close()

      // Construct Finalize message
      finalizeMsg := map[string]string{"type": "Finalize"}
      jsonMsg, err := json.Marshal(finalizeMsg)
      if err != nil {
          log.Fatal("Error encoding JSON:", err)
      }

      // Send Finalize message
      err = conn.WriteMessage(websocket.TextMessage, jsonMsg)
      if err != nil {
          log.Fatal("Error sending Finalize message:", err)
      }
  }
  ```

  ```csharp C#
  using System;
  using System.Net.WebSockets;
  using System.Text;
  using System.Threading;
  using System.Threading.Tasks;

  class Program
  {
      static async Task Main(string[] args)
      {
          // Set up the WebSocket URL and headers
          Uri uri = new Uri("wss://api.deepgram.com/v1/listen");

          string apiKey = "DEEPGRAM_API_KEY";

          // Create a new client WebSocket instance
          using (ClientWebSocket ws = new ClientWebSocket())
          {
              // Set the authorization header
              ws.Options.SetRequestHeader("Authorization", "Token " + apiKey);

              // Connect to the WebSocket server
              await ws.ConnectAsync(uri, CancellationToken.None);

              // Construct the Finalize message
              string finalizeMsg = "{\"type\": \"Finalize\"}";

              // Convert the Finalize message to a byte array
              byte[] finalizeBytes = Encoding.UTF8.GetBytes(finalizeMsg);

              // Send the Finalize message asynchronously
              await ws.SendAsync(new ArraySegment<byte>(finalizeBytes), WebSocketMessageType.Text, true, CancellationToken.None);
          }
      }
  }
  ```
</CodeGroup>

### Streaming Examples

Here are more complete examples that make a streaming request and use Finalize. Try running these examples to see how Finalize can be sent to Deepgram, forcing the API to process all unprocessed audio data and immediately return the results.

<CodeGroup>
  ```javascript JavaScript
  const WebSocket = require("ws");
  const axios = require("axios");
  const { PassThrough } = require("stream");

  const apiKey = "YOUR_DEEPGRAM_API_KEY";
  const headers = {
    Authorization: `Token ${apiKey}`,
  };

  // Initialize WebSocket connection
  const ws = new WebSocket("wss://api.deepgram.com/v1/listen", { headers });

  ws.on("open", async function open() {
    console.log("WebSocket connection established.");

    try {
      // Fetch the audio stream from the remote URL
      const response = await axios({
        method: "get",
        url: "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service",
        responseType: "stream",
      });

      const passThrough = new PassThrough();
      response.data.pipe(passThrough);

      passThrough.on("data", (chunk) => {
        ws.send(chunk);
      });

      passThrough.on("end", () => {
        console.log("Audio stream ended.");
        finalizeWebSocket();
      });

      passThrough.on("error", (err) => {
        console.error("Stream error:", err.message);
      });

      // Send Finalize message after 10 seconds
      setTimeout(() => {
        finalizeWebSocket();
      }, 10000);
    } catch (error) {
      console.error("Error fetching audio stream:", error.message);
    }
  });

  // Handle WebSocket message event
  ws.on("message", function incoming(data) {
    let response = JSON.parse(data);
    if (response.type === "Results") {
      console.log("Transcript: ", response.channel.alternatives[0].transcript);
    }
  });

  // Handle WebSocket close event
  ws.on("close", function close() {
    console.log("WebSocket connection closed.");
  });

  // Handle WebSocket error event
  ws.on("error", function error(err) {
    console.error("WebSocket error:", err.message);
  });

  // Send Finalize message to WebSocket
  function finalizeWebSocket() {
    const finalizeMsg = JSON.stringify({ type: "Finalize" });
    ws.send(finalizeMsg);
    console.log("Finalize message sent.");
  }

  // Gracefully close the WebSocket connection when done
  function closeWebSocket() {
    const closeMsg = JSON.stringify({ type: "CloseStream" });
    ws.send(closeMsg);
    ws.close();
  }

  // Close WebSocket when process is terminated
  process.on("SIGINT", () => {
    closeWebSocket();
    process.exit();
  });
  ```

  ```python Python
  from websocket import WebSocketApp
  import websocket
  import json
  import threading
  import requests
  import time

  auth_token = "YOUR_DEEPGRAM_API_KEY"  # Replace with your actual authorization token

  headers = {
      "Authorization": f"Token {auth_token}"
  }

  # WebSocket URL
  ws_url = "wss://api.deepgram.com/v1/listen"

  # Audio stream URL
  audio_url = "http://stream.live.vc.bbcmedia.co.uk/bbc_world_service"

  # Define the WebSocket functions on_open, on_message, on_close, and on_error

  def on_open(ws):
      print("WebSocket connection established.")

      # Start audio streaming thread
      audio_thread = threading.Thread(target=stream_audio, args=(ws,))
      audio_thread.daemon = True
      audio_thread.start()

      # Finalize test thread
      finalize_thread = threading.Thread(target=finalize_test, args=(ws,))
      finalize_thread.daemon = True
      finalize_thread.start()

  def on_message(ws, message):
      try:
          response = json.loads(message)
          if response.get("type") == "Results":
              transcript = response["channel"]["alternatives"][0].get("transcript", "")
              if transcript:
                  print("Transcript:", transcript)

              # Check if this is the final result from finalize
              # Note: in most cases, you will receive this response, but it is not guaranteed if there is no significant amount of audio data left to process.
              if response.get("from_finalize", False):
                  print("Finalization complete.")
      except json.JSONDecodeError as e:
          print(f"Error decoding JSON message: {e}")
      except KeyError as e:
          print(f"Key error: {e}")

  def on_close(ws, close_status_code, close_msg):
      print(f"WebSocket connection closed with code: {close_status_code}, message: {close_msg}")

  def on_error(ws, error):
      print("WebSocket error:", error)

  # Define the function to stream audio to the WebSocket

  def stream_audio(ws):
      response = requests.get(audio_url, stream=True)
      if response.status_code == 200:
          print("Audio stream opened.")
          for chunk in response.iter_content(chunk_size=4096):
              ws.send(chunk, opcode=websocket.ABNF.OPCODE_BINARY)
      else:
          print("Failed to open audio stream:", response.status_code)

  # Define the function to send the Finalize message

  def finalize_test(ws):
      # Wait for 10 seconds before sending the Finalize message to simulate the end of audio streaming
      time.sleep(10)
      finalize_message = json.dumps({"type": "Finalize"})
      ws.send(finalize_message)
      print("Finalize message sent.")

  # Create WebSocket connection

  ws = WebSocketApp(ws_url, on_open=on_open, on_message=on_message, on_close=on_close, on_error=on_error, header=headers)

  # Run the WebSocket

  ws.run_forever()
  ```
</CodeGroup>

***
