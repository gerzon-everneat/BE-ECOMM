// const validEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const validEmailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const isValidEmail = (value: string) => {
  if (
    // email
    !value ||
    value.length === 0 ||
    !value.match(validEmailRegex)
  )
    throw new Error(
      "Please enter a valid email address, like yourname@example.com"
    );
};

export const generateToken = (payload: any) => {};
