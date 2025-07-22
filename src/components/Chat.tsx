'use client';
import { useChat } from '@ai-sdk/react';
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';

export default function KaiChat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
    headers: {
      'Content-Type': 'application/json',
    },
  });



  return (
    <div className="p-6 max-w-md mx-auto bg-gradient-to-r from-protea-pink to-savanna-orange rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-ubuntu-cream mb-4">Kai Catering 🍖</h1>
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {messages.map((m: { id: Key | null | undefined; role: string; content: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.role === 'user' ? 'bg-ubuntu-cream text-black' : 'bg-braai-flame text-white'
            }`}
          >
            {m.content}
          </div>
        ))}
        {status === 'streaming' && (
          <div className="text-center text-ubuntu-cream">Loading... 🔥</div>
        )}

         {status === 'submitted' && (
          <div className="text-center text-ubuntu-cream">Executing tool... 🛠️</div>
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