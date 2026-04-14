import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setTitle } from '../store/presentationSlice';

export const TitleEditor: React.FC = () => {
  const dispatch = useAppDispatch();
  const title = useAppSelector(state => state.presentation.title);

  return (
    <div className="title-editor">
      <input
        type="text"
        value={title}
        onChange={(e) => {
          dispatch(setTitle(e.target.value));
          console.log('New title:', e.target.value);
        }}
      />
    </div>
  );
};

export default TitleEditor;