interface Props {
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export const Button = ({ className, onClick }: Props) => {
  return <Button className={className} onClick={onClick}></Button>;
};
