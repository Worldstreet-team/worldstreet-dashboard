
import CardBox from '@/components/shared/CardBox'
import { Label, Textarea } from "flowbite-react";

const TextAreaEle = () => {
  return (
    <CardBox>
      <h4 className="text-lg font-semibold">Textarea element</h4>
      <div className="max-w-md ">
        <div className="mb-2 block">
          <Label htmlFor="comment">Your message</Label>
        </div>
        <Textarea
          id="comment"
          placeholder="Leave a comment..."
          required
          rows={8}
          className="form-control-textarea rounded-md"
        />
      </div>
    </CardBox>
  );
};

export default TextAreaEle;
