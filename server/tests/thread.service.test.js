import assert from "node:assert/strict";
import test from "node:test";
import * as threadService from "../src/services/thread.service.js";
import * as threadRepository from "../src/repositories/thread.repository.js";
import * as messageRepository from "../src/repositories/message.repository.js";
import { PERMISSIONS } from "../src/constants/permissions.js";

test("setArchived rejects non-creators even with thread-management permission", async () => {
  const originalUpdateById = threadRepository.updateById;
  threadRepository.updateById = async () => {
    throw new Error("updateById should not be called");
  };

  try {
    await assert.rejects(
      () =>
        threadService.setArchived(
          { _id: "thread-1", createdBy: "creator", archived: false, locked: false },
          "other-user",
          PERMISSIONS.MANAGE_THREADS,
          true
        ),
      (err) => {
        assert.match(err.message, /Only the thread creator/i);
        return true;
      }
    );
  } finally {
    threadRepository.updateById = originalUpdateById;
  }
});

test("deleteThread rejects non-creators even with thread-management permission", async () => {
  const originalDeleteById = threadRepository.deleteById;
  const originalDeleteByThread = messageRepository.deleteByThread;
  threadRepository.deleteById = async () => {
    throw new Error("deleteById should not be called");
  };
  messageRepository.deleteByThread = async () => {
    throw new Error("deleteByThread should not be called");
  };

  try {
    await assert.rejects(
      () =>
        threadService.deleteThread(
          { _id: "thread-2", createdBy: "creator" },
          "other-user",
          PERMISSIONS.MANAGE_THREADS
        ),
      (err) => {
        assert.match(err.message, /Only the thread creator/i);
        return true;
      }
    );
  } finally {
    threadRepository.deleteById = originalDeleteById;
    messageRepository.deleteByThread = originalDeleteByThread;
  }
});
