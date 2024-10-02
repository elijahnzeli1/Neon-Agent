// src/components/FeedbackForm.tsx
import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface FeedbackFormProps {
  onSubmit: (rating: number, comment: string) => void;
}
const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const { data: session } = useSession();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (session) {
      onSubmit(rating, comment);
      setRating(0);
      setComment('');
    } else {
      alert('Please sign in to submit feedback');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Rating:</label>
        <input
          type="number"
          min="1"
          max="5"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        />
      </div>
      <div>
        <label>Comment:</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button type="submit">Submit Feedback</button>
    </form>
  );
};

export default FeedbackForm;

