import { Label, TextInput } from "flowbite-react";
import CardBox from '@/components/shared/CardBox'

const DisableInputs = () => {
  return (
    <CardBox>
      <h4 className="text-lg font-semibold">Disabled inputs</h4>
      <div className="flex max-w-md flex-col gap-4 pb-20">
        <Label htmlFor="disabledInput1">API token</Label>
        <TextInput
          type="text"
          id="disabledInput1"
          placeholder="Disabled input"
          disabled className="form-control"
        />
        <Label htmlFor="disabledInput2">Personal access token</Label>
        <TextInput
          type="text"
          id="disabledInput2"
          placeholder="Disabled readonly input"
          disabled className="form-control"
          readOnly
        />
      </div>
    </CardBox>
  );
};

export default DisableInputs;
