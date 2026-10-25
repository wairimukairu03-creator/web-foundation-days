# Day 8 Reflection: Event Ticketing System Design

### 1. What was the most difficult concept in the course, and how did you overcome it?

The most challenging part of this journey was mastering JavaScript. Being completely new to the language, the fast-paced nature of the bootcamp meant we had limited time to fully absorb and practice foundational concepts like asynchronous operations, callbacks, promises, and closures before moving on to advanced implementation.

I overcame this hurdle by taking personal initiative outside of class hours. I leveraged comprehensive video tutorials on YouTube to see visual code walkthroughs and spent hours reading through the Mozilla Developer Network (MDN) documentation to break down complex syntax. By combining these resources with hands-on coding practice, I was able to bridge the gaps in my understanding and successfully apply JavaScript to our project requirements.

### 2. Which part of your capstone would you improve based on the feedback you received?

Based on peer reviews and mentor insights, I want to overhaul the payment integration layer of my capstone. Currently, my system uses synchronous HTTP endpoints to communicate with payment APIs.

If an external gateway faces latency or downtime, it creates a backpressure wave that locks up my server threads. I will refactor this structure into an event-driven mechanism using a dedicated message broker. This modification will decouple client requests from third-party networks completely, guaranteeing that payment updates fail gracefully via a background retry loop without degrading user experience on the frontend.

### 3. What will you learn next?

Moving forward, my primary focus is to deepen my understanding of backend development and improve my fluency across different programming languages. While I have built a solid foundation during this cohort, I want to explore strongly-typed backend ecosystems (such as Python with FastAPI or Java with Spring Boot) to see how different languages handle multi-threading, database interactions, and architecture patterns. This will help me become a more versatile and adaptable backend engineer.
