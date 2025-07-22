'use client';
import { useChat } from 'ai/react';
import { useState } from 'react';

export default function KaiChat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
  });
  const [phoneNumber, setPhoneNumber] = useState('+27'); // Pre-fill with SA country code

  const placeOrder = async (catererId: string, eventDetails: string) => {
    const res = await fetch('/api/order', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user', // Replace with real user ID later
        catererId,
        eventDetails: { event_name: eventDetails },
        phoneNumber,
      }),
    });
    const data = await res.json();
    if (data.order) alert('Order placed! Check your SMS. 🔥');
    else alert('Eish, something went wrong. Try again.');
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-gradient-to-r from-protea-pink to-savanna-orange rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-ubuntu-cream mb-4">Kai Catering 🍖</h1>
      <input
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="+27 Your Number"
        className="w-full p-2 mb-4 rounded border border-gray-300 text-black"
      />
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user' ? 'bg-ubuntu-cream text-black' : 'bg-braai-flame text-white'
            }`}
          >
            {m.role === 'assistant' ? (
              <>
                {m.content}
                {m.content.includes('caterers') && (
                  <button
                    className="mt-2 bg-ubuntu-cream text-braai-flame p-2 rounded"
                    onClick={() => {
                      const caterers = JSON.parse(m.content).caterers;
                      placeOrder(caterers[0].id, input);
                    }}
                  >
                    Order from {JSON.parse(m.content).caterers[0].name}
                  </button>
                )}
              </>
            ) : (
              m.content
            )}
          </div>
        ))}
        {status === 'streaming' && (
          <div className="text-center text-ubuntu-cream">Loading... 🔥</div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="E.g., Catering for 20 in Soweto"
          className="flex-1 p-2 rounded border border-gray-300 text-black"
        />
        <button
          type="submit"
          className="bg-braai-flame text-white p-2 rounded hover:bg-opacity-80"
          disabled={status === 'streaming' || status === 'submitted'} 
        >
          Send
        </button>
      </form>
    </div>
  );
}