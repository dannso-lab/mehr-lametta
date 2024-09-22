import { withTheme } from '@rjsf/core';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { Theme as SemanticUITheme } from '@rjsf/semantic-ui';

// Make modifications to the theme with your own fields and widgets

const Form = withTheme(SemanticUITheme);


const schema: RJSFSchema = {
  title: 'Test form',
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    age: {
      type: 'number',
    },
  },
};



export function Sandbox() {
  return (
    <>
      <h1>hi this the sandbox</h1>
      <Form schema={schema} validator={validator}/>,
    </>
  );
}